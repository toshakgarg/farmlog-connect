"""
app/agents/reader_agent.py
Reader Agent — reads handwritten/printed values from a filled form photo.

Multi-Provider Support:
  - Gemini (default free tier via Google AI Studio)
  - OpenAI (gpt-4o-mini / gpt-4o)
  - Anthropic (Claude Vision)
"""

import asyncio
import json
import logging
import os
import re
from typing import Any

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.models.schema import FormField, FieldValue, ValueSource
from app.utils.image_utils import preprocess_form_image

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a handwriting recognition specialist for agricultural form digitization.
You read filled paper forms — handwritten and printed — including Hindi and English text.
You output only valid JSON — no explanation, no markdown fences, no preamble."""


def build_reader_prompt(schema_fields: list[FormField]) -> str:
    """Build a schema-grounded prompt so the Vision model knows exactly which fields to find."""
    schema_lines = "\n".join(
        f'  key="{f.key}" | label="{f.label}" | type={f.type.value} | section="{f.section}"'
        for f in schema_fields
    )
    return f"""Read every filled-in value from this form photo with extreme precision.

SCHEMA — find exactly these fields:
{schema_lines}

READING RULES:
- Read handwritten AND printed/typed values accurately
- Read Hindi text as-is, preserve diacritics (e.g. "दौलत राम", "ट्यूबवेल")
- Empty / blank / unselected fields: value = null (DO NOT return "unchecked" or empty string)
- Checkboxes / Choice options:
  * Look very carefully for checkmarks (✓), tick marks, filled boxes (■), crosses (✗), or handwritten marks inside or beside the box/option.
  * If checked/selected: set value = the label text of that option (e.g. "ट्यूबवेल" or "हाँ") or "checked"
  * If NOT checked: set value = null (and source = "empty")
- Signatures / Thumbprints: "[signed]" if present, null if blank
- Numbers: digits only, no units (e.g. "5" or "9991770410")
- Dates: preserve format as written

CONFIDENCE SCALE:
- 95–100: clearly printed text or obvious checkmark
- 80–94:  clean, clear handwriting
- 60–79:  readable but slightly unclear handwriting
- 40–59:  difficult handwriting, best guess
- 0–39:   unreadable or blank

SOURCE: "handwriting" | "printed" | "checkbox" | "empty"

Return ONLY this JSON:
{{
  "pairs": [
    {{
      "key": "field_key",
      "label": "Original Label",
      "value": "read value or null",
      "confidence": 85,
      "source": "handwriting"
    }}
  ],
  "image_quality": "good | fair | poor",
  "notes": "optional note about image quality or unusual findings"
}}"""


class ReaderAgent:
    """
    Agent that reads handwriting from a single filled form photo.
    Supports Gemini, OpenAI, Claude, and Azure Vision.
    """

    def __init__(
        self,
        client: Any = None,
        model: str | None = None,
        provider: str | None = None,
    ):
        self.client = client
        self.provider = (provider or os.getenv("VISION_PROVIDER", "gemini")).lower()

        if self.provider == "gemini":
            self.model = model or os.getenv("GEMINI_MODEL", "gemini-3.5-flash")
            self.api_key = os.getenv("GEMINI_API_KEY", "")
        elif self.provider == "openai":
            self.model = model or os.getenv("OPENAI_MODEL", "gpt-4o-mini")
            self.api_key = os.getenv("OPENAI_API_KEY", "")
        elif self.provider == "anthropic":
            self.model = model or os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")
            self.api_key = os.getenv("ANTHROPIC_API_KEY", "")
        else:
            self.model = model or "gemini-3.5-flash"
            self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY") or ""

    async def read_form(
        self,
        image_base64: str,
        image_media_type: str,
        schema_fields: list[FormField],
    ) -> dict[str, Any]:
        """
        Read all values from a single filled form image.
        Returns dict with: pairs, image_quality, notes
        """
        logger.info(f"ReaderAgent ({self.provider}): preprocessing image for {len(schema_fields)} fields")
        processed_b64, processed_type = preprocess_form_image(
            image_base64,
            image_media_type,
            enhance_contrast=True,
            sharpen=True,
        )

        prompt = build_reader_prompt(schema_fields)

        logger.info(f"ReaderAgent ({self.provider}): calling Vision API model={self.model}")
        raw_response = await self._call_vision(processed_b64, processed_type, prompt)

        logger.info(f"ReaderAgent ({self.provider}): parsing JSON response")
        parsed = self._parse_json_response(raw_response)

        pairs   = parsed.get("pairs", [])
        quality = parsed.get("image_quality", "unknown")
        notes   = parsed.get("notes", "")

        filled_count = sum(1 for p in pairs if p.get("value") is not None)
        logger.info(f"ReaderAgent: read {filled_count}/{len(pairs)} non-empty fields (quality: {quality})")

        return {"pairs": pairs, "image_quality": quality, "notes": notes}

    async def _call_vision(self, image_base64: str, media_type: str, prompt: str) -> str:
        """Dispatch call to the appropriate vision provider."""
        if self.provider == "gemini":
            return await self._call_gemini(image_base64, media_type, prompt)
        elif self.provider == "openai":
            return await self._call_openai(image_base64, media_type, prompt)
        elif self.provider == "anthropic":
            return await self._call_anthropic(image_base64, media_type, prompt)
        else:
            if os.getenv("GEMINI_API_KEY"):
                return await self._call_gemini(image_base64, media_type, prompt)
            elif os.getenv("OPENAI_API_KEY"):
                return await self._call_openai(image_base64, media_type, prompt)
            elif os.getenv("ANTHROPIC_API_KEY"):
                return await self._call_anthropic(image_base64, media_type, prompt)
            else:
                raise ValueError("No Vision API key configured (GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)")

    async def _call_gemini(self, image_base64: str, media_type: str, prompt: str) -> str:
        """Call Google Gemini Vision API."""
        key = self.api_key or os.getenv("GEMINI_API_KEY")
        if not key:
            raise ValueError("GEMINI_API_KEY is not set.")

        models_to_try = [self.model, "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.8-flash"]
        seen = set()
        unique_models = [m for m in models_to_try if not (m in seen or seen.add(m))]

        last_error = None
        for m in unique_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={key}"
            payload = {
                "contents": [{
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": media_type,
                                "data": image_base64
                            }
                        },
                        {
                            "text": f"{SYSTEM_PROMPT}\n\n{prompt}"
                        }
                    ]
                }],
                "generationConfig": {
                    "response_mime_type": "application/json",
                    "temperature": 0.1
                }
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data["candidates"][0]["content"]["parts"][0]["text"]
                last_error = f"Gemini API error {res.status_code}: {res.text}"
                logger.warning(f"Gemini model '{m}' failed ({res.status_code}). Trying fallback model...")

        raise ValueError(last_error or "Gemini API call failed.")

    async def _call_openai(self, image_base64: str, media_type: str, prompt: str) -> str:
        """Call OpenAI Vision API (gpt-4o-mini / gpt-4o)."""
        key = self.api_key or os.getenv("OPENAI_API_KEY")
        if not key:
            raise ValueError("OPENAI_API_KEY is not set.")

        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{media_type};base64,{image_base64}"}
                        },
                        {"type": "text", "text": prompt}
                    ]
                }
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(url, headers=headers, json=payload)
            if res.status_code != 200:
                raise ValueError(f"OpenAI API error {res.status_code}: {res.text}")
            data = res.json()
            return data["choices"][0]["message"]["content"]

    async def _call_anthropic(self, image_base64: str, media_type: str, prompt: str) -> str:
        """Call Anthropic Claude Vision API."""
        if not self.client:
            import anthropic
            key = self.api_key or os.getenv("ANTHROPIC_API_KEY")
            self.client = anthropic.Anthropic(api_key=key)

        message = await asyncio.to_thread(
            self.client.messages.create,
            model=self.model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_base64,
                            },
                        },
                        {"type": "text", "text": prompt},
                    ],
                }
            ],
        )
        return message.content[0].text

    def _parse_json_response(self, raw: str) -> dict[str, Any]:
        """Parse raw response string into JSON object."""
        clean = re.sub(r"^```(?:json)?\s*", "", raw.strip())
        clean = re.sub(r"\s*```$", "", clean)
        start = clean.find("{")
        end   = clean.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError(f"No JSON in reader response: {raw[:300]}")
        return json.loads(clean[start:end])
