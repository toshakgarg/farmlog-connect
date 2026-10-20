"""
app/models/schema.py
All Pydantic data models for the Form Intelligence service.
Written typed and strict — like a data scientist who cares about clean data contracts.
"""

from __future__ import annotations
from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field, field_validator
import re


# ── Enums ─────────────────────────────────────────────────────────────────────

class FieldType(str, Enum):
    TEXT      = "text"
    NUMBER    = "number"
    DATE      = "date"
    CHECKBOX  = "checkbox"
    SIGNATURE = "signature"
    TABLE     = "table"

class RecordStatus(str, Enum):
    COMPLETE      = "complete"
    NEEDS_REVIEW  = "needs_review"

class UploadStatus(str, Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    DONE       = "done"
    FAILED     = "failed"

class ValueSource(str, Enum):
    HANDWRITING = "handwriting"
    PRINTED     = "printed"
    CHECKBOX    = "checkbox"
    EMPTY       = "empty"


# ── Field-level models ────────────────────────────────────────────────────────

class FormField(BaseModel):
    """One extractable field from a form — key-value schema definition."""
    key:      str       = Field(..., description="snake_case English identifier")
    label:    str       = Field(..., description="Original label as printed on form")
    type:     FieldType = Field(default=FieldType.TEXT)
    section:  str       = Field(default="", description="Section heading this field belongs to")
    required: bool      = Field(default=True)

    @field_validator("key")
    @classmethod
    def sanitize_key(cls, v: str) -> str:
        v = v.lower().strip()
        v = re.sub(r"[^a-z0-9\s_]", "", v)
        v = re.sub(r"\s+", "_", v)
        v = v.strip("_")[:60]
        return v or "field"


class FieldValue(BaseModel):
    """The read value for one field from a filled form."""
    value:      str | None
    confidence: int   = Field(..., ge=0, le=100, description="0–100 confidence score")
    source:     ValueSource = Field(default=ValueSource.HANDWRITING)


class LowConfidenceFlag(BaseModel):
    key:        str
    label:      str
    confidence: int
    reason:     str


# ── Schema (output of Setup Pipeline) ────────────────────────────────────────

class FormSchema(BaseModel):
    """Complete schema extracted from a blank form — stored in Cosmos DB."""
    id:         str
    type:       str = "form_schema"
    form_title: str = "Untitled Form"
    form_code:  str = "UNKNOWN"
    version:    str = "1.0"
    fields:     list[FormField] = Field(default_factory=list)
    sections:   list[str] = Field(default_factory=list)
    created_by: str = "system"
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    status:     str = "active"

    def to_cosmos(self) -> dict[str, Any]:
        """Serialize for Cosmos DB (Pydantic v2 model_dump)."""
        return self.model_dump()

    @classmethod
    def from_cosmos(cls, doc: dict[str, Any]) -> "FormSchema":
        data = dict(doc)
        if "form_title" not in data and "title" in data:
            data["form_title"] = data["title"]
        if "form_code" not in data and "code" in data:
            data["form_code"] = data["code"]
        if "created_by" not in data and "created_user" in data:
            data["created_by"] = data["created_user"]
        return cls(**data)


# ── Pending Upload ────────────────────────────────────────────────────────────

class PendingUpload(BaseModel):
    """Tracks a supervisor-uploaded photo waiting for digitization."""
    id:            str
    type:          str = "pending_upload"
    schema_id:     str
    farmer_id:     str
    supervisor_id: str
    blob_url:      str
    blob_path:     str
    photo_index:   int
    status:        UploadStatus = UploadStatus.PENDING
    uploaded_at:   str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    digitized_at:  str | None = None
    record_id:     str | None = None

    def to_cosmos(self) -> dict[str, Any]:
        return self.model_dump()


# ── Form Record (output of Reader Pipeline) ───────────────────────────────────

class FormRecord(BaseModel):
    """Digitized form data — stored in Cosmos DB."""
    id:            str
    type:          str = "form_record"
    schema_id:     str
    farmer_id:     str
    supervisor_id: str
    submitted_at:  str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    photo_count:   int
    data:          dict[str, FieldValue]
    flags:         list[LowConfidenceFlag] = Field(default_factory=list)
    status:        RecordStatus
    blob_paths:    list[str] = Field(default_factory=list)

    def to_cosmos(self) -> dict[str, Any]:
        return self.model_dump()


# ── API Request / Response models ─────────────────────────────────────────────

class PhotoPayload(BaseModel):
    image_base64:   str
    image_media_type: str = "image/jpeg"
    photo_index:    int = 0

    @field_validator("image_media_type")
    @classmethod
    def validate_media_type(cls, v: str) -> str:
        allowed = {"image/jpeg", "image/png", "image/webp"}
        if v not in allowed:
            raise ValueError(f"image_media_type must be one of {allowed}")
        return v

    @field_validator("image_base64")
    @classmethod
    def validate_base64_size(cls, v: str) -> str:
        size_mb = len(v) * 3 / 4 / (1024 * 1024)
        if size_mb > 10:
            raise ValueError(f"Image too large: {size_mb:.1f}MB (max 10MB)")
        return v


# Setup Pipeline
class SetupRequest(BaseModel):
    image_base64:     str
    image_media_type: str = "image/jpeg"
    admin_id:         str
    form_code:        str | None = None

class SetupResponse(BaseModel):
    model_config = ConfigDict(populate_by_name=True, protected_namespaces=())

    success:     bool
    schema_id:   str
    form_title:  str
    field_count: int
    sections:    list[str]
    schema_obj:  FormSchema = Field(..., alias="schema")
    error:       str | None = None


# Upload Pipeline
class UploadRequest(BaseModel):
    photos:       list[PhotoPayload]
    schema_id:    str
    farmer_id:    str
    supervisor_id: str

class UploadResponse(BaseModel):
    success:       bool
    uploaded_count: int
    pending_ids:   list[str]
    error:         str | None = None


# Digitize Pipeline
class DigitizetRequest(BaseModel):
    schema_id:     str
    supervisor_id: str
    farmer_id:     str | None = None   # optional filter

class DigitizeResponse(BaseModel):
    success:     bool
    record_id:   str
    status:      RecordStatus
    data:        dict[str, FieldValue]
    flags:       list[LowConfidenceFlag]
    photo_count: int
    record:      FormRecord
    error:       str | None = None


# Schemas list
class SchemasResponse(BaseModel):
    success: bool
    schemas: list[FormSchema]

# Pending count
class PendingResponse(BaseModel):
    success: bool
    count:   int
    uploads: list[PendingUpload]
