"""
app/agents/setup_agent.py
Setup Agent — extracts the field schema from a blank form image.

Multi-Provider Support:
  - Gemini (default free tier via Google AI Studio)
  - OpenAI (gpt-4o-mini / gpt-4o)
  - Anthropic (Claude Vision)
  - Azure Vision
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

from app.models.schema import FormField, FieldType
from app.utils.image_utils import preprocess_form_image

logger = logging.getLogger(__name__)


SYSTEM_PROMPT = """You are a form field extraction specialist for an agricultural data collection system.
Your job is to read blank paper forms and extract every fillable field with precision.
You output only valid JSON — no explanation, no markdown fences, no preamble."""

EXTRACTION_PROMPT = """Look at this blank form image carefully.

Extract ALL fillable fields. For each field provide:
- key: snake_case English identifier (e.g. "farmer_name", "sowing_date", "ph_baseline")
- label: exact text as printed — preserve Hindi/English/bilingual exactly as written
- type: one of text | number | date | checkbox | signature | table
- section: the section or heading this field belongs to

RULES:
- Every blank line, box, or fill area = one field
- Checkboxes (□ ☐): type = "checkbox"
- Signature lines: type = "signature"
- Table columns (e.g. Soil pH/EC/N/P/K rows): one field per cell, e.g. "ph_baseline", "ph_followup"
- GPS coordinates: two fields — "gps_lat" and "gps_long"
- Preserve bilingual labels exactly e.g. "किसान का नाम / Farmer Name"
- If a field has options (e.g. □ Male □ Female), still type = "checkbox", label = the question

Return ONLY this JSON structure:
{
  "form_title": "full title from the header",
  "form_code": "form code if visible e.g. JOITA-CCF-F01",
  "sections": ["Section 1", "Section 2"],
  "fields": [
    {
      "key": "snake_case_key",
      "label": "Original label text",
      "type": "text",
      "section": "Section name",
      "required": true
    }
  ]
}"""


class SetupAgent:
    """
    Agent that reads a blank form and extracts a reusable field schema.
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

    async def extract_schema(
        self,
        image_base64: str,
        image_media_type: str = "image/jpeg",
    ) -> dict[str, Any]:
        """
        Extract schema from a blank form image using configured Vision provider.
        """
        logger.info(f"SetupAgent ({self.provider}): preprocessing image")
        processed_b64, processed_type = preprocess_form_image(image_base64, image_media_type)

        logger.info(f"SetupAgent ({self.provider}): calling Vision API model={self.model}")
        raw_response = await self._call_vision(processed_b64, processed_type)

        logger.info(f"SetupAgent ({self.provider}): parsing JSON response")
        parsed = self._parse_json_response(raw_response)

        fields = self._build_fields(parsed.get("fields", []))
        logger.info(f"SetupAgent: extracted {len(fields)} fields from {len(parsed.get('sections', []))} sections")

        return {
            "form_title": parsed.get("form_title", "Unknown Form"),
            "form_code":  parsed.get("form_code", ""),
            "sections":   parsed.get("sections", []),
            "fields":     fields,
        }

    async def _call_vision(self, image_base64: str, media_type: str) -> str:
        """Dispatch call to the appropriate vision provider."""
        if self.provider == "gemini":
            return await self._call_gemini(image_base64, media_type)
        elif self.provider == "openai":
            return await self._call_openai(image_base64, media_type)
        elif self.provider == "anthropic":
            return await self._call_anthropic(image_base64, media_type)
        else:
            # Default fallback: try Gemini, then OpenAI
            if os.getenv("GEMINI_API_KEY"):
                return await self._call_gemini(image_base64, media_type)
            elif os.getenv("OPENAI_API_KEY"):
                return await self._call_openai(image_base64, media_type)
            elif os.getenv("ANTHROPIC_API_KEY"):
                return await self._call_anthropic(image_base64, media_type)
            else:
                raise ValueError("No Vision API key configured (GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY)")

    async def _call_gemini(self, image_base64: str, media_type: str) -> str:
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
                            "text": f"{SYSTEM_PROMPT}\n\n{EXTRACTION_PROMPT}"
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

    async def _call_openai(self, image_base64: str, media_type: str) -> str:
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
                        {"type": "text", "text": EXTRACTION_PROMPT}
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

    async def _call_anthropic(self, image_base64: str, media_type: str) -> str:
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
                        {"type": "text", "text": EXTRACTION_PROMPT},
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
            raise ValueError(f"No JSON object found in response: {raw[:300]}")
        return json.loads(clean[start:end])

    def _build_fields(self, raw_fields: list[dict]) -> list[FormField]:
        """Convert raw dicts into validated FormField objects."""
        fields = []
        seen_keys: set[str] = set()

        for f in raw_fields:
            try:
                field = FormField(
                    key     = f.get("key", ""),
                    label   = f.get("label", f.get("key", "unknown")),
                    type    = f.get("type", FieldType.TEXT),
                    section = f.get("section", ""),
                    required = f.get("required", True),
                )
                if field.key in seen_keys:
                    field = field.model_copy(update={"key": f"{field.key}_{len(seen_keys)}"})
                seen_keys.add(field.key)
                fields.append(field)

            except Exception as e:
                logger.warning(f"Skipping invalid field {f}: {e}")

        return fields
