"""
tests/test_agents.py
Unit tests for agents and validator.
Run: pytest tests/ -v
"""

import pytest
from app.agents.validator import merge_and_validate
from app.models.schema import FormField, FieldType, RecordStatus


def make_field(key: str, required: bool = True) -> FormField:
    return FormField(key=key, label=key.replace("_", " ").title(), type=FieldType.TEXT, required=required)


# ── Validator tests ────────────────────────────────────────────────────────────

def test_merge_picks_highest_confidence():
    """Best-of-N: should pick the value with highest confidence."""
    fields = [make_field("farmer_name")]
    photo1 = [{"key": "farmer_name", "label": "Farmer Name", "value": "Ramesh",  "confidence": 60, "source": "handwriting"}]
    photo2 = [{"key": "farmer_name", "label": "Farmer Name", "value": "R. Kumar", "confidence": 88, "source": "handwriting"}]

    result = merge_and_validate([photo1, photo2], fields)
    assert result["data"]["farmer_name"].value == "R. Kumar"
    assert result["data"]["farmer_name"].confidence == 88


def test_flags_low_confidence():
    """Fields below threshold should be flagged."""
    fields = [make_field("farmer_name")]
    pairs  = [{"key": "farmer_name", "label": "Farmer Name", "value": "Ramesh", "confidence": 45, "source": "handwriting"}]

    result = merge_and_validate([pairs], fields, confidence_threshold=60)
    assert len(result["flags"]) == 1
    assert result["flags"][0].key == "farmer_name"
    assert result["status"] == RecordStatus.NEEDS_REVIEW


def test_flags_missing_required():
    """Required fields that are empty should be flagged."""
    fields = [make_field("farmer_name", required=True)]
    pairs  = [{"key": "farmer_name", "label": "Farmer Name", "value": None, "confidence": 0, "source": "empty"}]

    result = merge_and_validate([pairs], fields)
    assert any(f.key == "farmer_name" for f in result["flags"])


def test_complete_when_all_confident():
    """Status should be complete when all fields are above threshold."""
    fields = [make_field("farmer_name"), make_field("village")]
    pairs  = [
        {"key": "farmer_name", "label": "Farmer Name", "value": "Ramesh Kumar", "confidence": 92, "source": "handwriting"},
        {"key": "village",     "label": "Village",     "value": "Sirsoli",      "confidence": 88, "source": "handwriting"},
    ]

    result = merge_and_validate([pairs], fields)
    assert result["status"] == RecordStatus.COMPLETE
    assert len(result["flags"]) == 0


def test_optional_field_empty_not_flagged():
    """Optional fields that are empty should NOT be flagged."""
    fields = [make_field("remarks", required=False)]
    pairs  = [{"key": "remarks", "label": "Remarks", "value": None, "confidence": 0, "source": "empty"}]

    result = merge_and_validate([pairs], fields)
    assert len(result["flags"]) == 0


def test_stats_correct():
    """Stats should accurately reflect filled/flagged counts."""
    fields = [make_field("a"), make_field("b"), make_field("c")]
    pairs  = [
        {"key": "a", "label": "A", "value": "x",  "confidence": 90, "source": "handwriting"},
        {"key": "b", "label": "B", "value": "y",  "confidence": 40, "source": "handwriting"},
        {"key": "c", "label": "C", "value": None, "confidence": 0,  "source": "empty"},
    ]

    result = merge_and_validate([pairs], fields)
    assert result["stats"]["total"]   == 3
    assert result["stats"]["filled"]  == 2
    assert result["stats"]["flagged"] == 2  # b (low conf) + c (required empty)
