"""
app/agents/validator.py
Validator — merges results from multiple photos and flags low-confidence reads.

This is pure Python logic — no API calls.
A data scientist would treat this like a model ensemble:
  - Take the highest-confidence read for each field across all photos
  - Flag anything below threshold for human review
  - Track completeness
"""

import logging
from app.models.schema import (
    FormField,
    FieldValue,
    LowConfidenceFlag,
    RecordStatus,
    ValueSource,
)

logger = logging.getLogger(__name__)

DEFAULT_CONFIDENCE_THRESHOLD = 60


def merge_and_validate(
    all_photo_pairs: list[list[dict]],
    schema_fields: list[FormField],
    confidence_threshold: int = DEFAULT_CONFIDENCE_THRESHOLD,
) -> dict:
    """
    Merge read results from multiple photos and validate completeness.

    Strategy:
      - For each field key, pick the read with the HIGHEST confidence across all photos
        (best of N — like an ensemble taking the most confident prediction)
      - Flag fields where even the best read is below threshold
      - Flag required fields that are empty

    Args:
        all_photo_pairs: list of pairs lists, one per photo
                         each pair: {key, label, value, confidence, source}
        schema_fields:   the locked schema (defines what keys are expected)
        confidence_threshold: below this → flag for review

    Returns:
        {
          "data": {key: FieldValue},
          "flags": [LowConfidenceFlag],
          "status": "complete" | "needs_review",
          "stats": {total, filled, flagged, avg_confidence}
        }
    """
    # Step 1: Build key → best FieldValue (highest confidence across all photos)
    best: dict[str, FieldValue] = {}

    for pairs in all_photo_pairs:
        for p in pairs:
            key = p.get("key", "")
            if not key:
                continue

            value      = p.get("value")
            confidence = int(p.get("confidence", 0))
            source_str = p.get("source", "handwriting")

            try:
                source = ValueSource(source_str)
            except ValueError:
                source = ValueSource.HANDWRITING

            fv = FieldValue(value=value, confidence=confidence, source=source)

            existing = best.get(key)
            if existing is None or confidence > existing.confidence:
                best[key] = fv

    # Step 2: Fill in any schema fields not seen in any photo
    schema_key_set = {f.key for f in schema_fields}
    for field in schema_fields:
        if field.key not in best:
            best[field.key] = FieldValue(
                value=None, confidence=0, source=ValueSource.EMPTY
            )

    # Step 3: Validate and flag
    flags: list[LowConfidenceFlag] = []
    schema_map = {f.key: f for f in schema_fields}

    for key, fv in best.items():
        field = schema_map.get(key)
        if field is None:
            continue  # extra key not in schema — skip

        if fv.value is None:
            if field.required:
                flags.append(LowConfidenceFlag(
                    key=key,
                    label=field.label,
                    confidence=0,
                    reason="Required field is empty",
                ))
        elif fv.confidence < confidence_threshold:
            flags.append(LowConfidenceFlag(
                key=key,
                label=field.label,
                confidence=fv.confidence,
                reason=f"Low confidence read ({fv.confidence}%) — manual verification recommended",
            ))

    # Step 4: Compute stats
    filled_count = sum(1 for fv in best.values() if fv.value is not None)
    confidences  = [fv.confidence for fv in best.values() if fv.value is not None]
    avg_conf     = round(sum(confidences) / len(confidences), 1) if confidences else 0

    status = RecordStatus.NEEDS_REVIEW if flags else RecordStatus.COMPLETE

    logger.info(
        f"Validator: {filled_count}/{len(best)} fields filled, "
        f"{len(flags)} flags, avg confidence {avg_conf}%, status={status}"
    )

    return {
        "data":   best,
        "flags":  flags,
        "status": status,
        "stats": {
            "total":          len(best),
            "filled":         filled_count,
            "flagged":        len(flags),
            "avg_confidence": avg_conf,
        },
    }
