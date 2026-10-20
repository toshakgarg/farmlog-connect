"""
app/api/routes.py
All FastAPI route handlers.
Clean, thin — each handler just validates input and delegates to a pipeline.
"""

import base64
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends

from app.models.schema import (
    SetupRequest, SetupResponse,
    UploadRequest, UploadResponse,
    DigitizetRequest, DigitizeResponse,
    SchemasResponse, PendingResponse,
    PendingUpload,
)
from app.pipelines.setup_pipeline import SetupPipeline
from app.pipelines.reader_pipeline import ReaderPipeline
from app.storage.cosmos_client import CosmosDB
from app.storage.blob_client import BlobStorage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/form-intelligence")


# ── Dependency injection (set by main.py) ─────────────────────────────────────

_setup_pipeline:  SetupPipeline  | None = None
_reader_pipeline: ReaderPipeline | None = None
_cosmos:          CosmosDB       | None = None
_blob:            BlobStorage    | None = None

def set_dependencies(setup: SetupPipeline, reader: ReaderPipeline, cosmos: CosmosDB, blob: BlobStorage):
    global _setup_pipeline, _reader_pipeline, _cosmos, _blob
    _setup_pipeline  = setup
    _reader_pipeline = reader
    _cosmos          = cosmos
    _blob            = blob


# ── POST /api/form-intelligence/setup ─────────────────────────────────────────

@router.post("/setup", response_model=SetupResponse)
async def setup_form(request: SetupRequest):
    """
    Admin uploads a blank form image.
    Pipeline: Claude Vision reads fields → schema → saved to Cosmos DB.
    """
    logger.info(f"POST /setup | admin={request.admin_id} | form_code={request.form_code}")
    try:
        response = await _setup_pipeline.run(
            image_base64     = request.image_base64,
            image_media_type = request.image_media_type,
            admin_id         = request.admin_id,
            form_code        = request.form_code,
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Setup pipeline error")
        raise HTTPException(status_code=500, detail=f"Setup failed: {str(e)}")


# ── POST /api/form-intelligence/upload ────────────────────────────────────────

@router.post("/upload", response_model=UploadResponse)
async def upload_photos(request: UploadRequest):
    """
    Supervisor uploads 1–N filled form photos.
    Photos → Blob Storage + pending-uploads queue in Cosmos DB.
    Digitization is NOT triggered yet — happens separately.
    """
    logger.info(
        f"POST /upload | schema={request.schema_id} | "
        f"farmer={request.farmer_id} | photos={len(request.photos)}"
    )

    if len(request.photos) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 photos per upload")

    # Verify schema exists
    schema = _cosmos.get_schema(request.schema_id)
    if not schema:
        raise HTTPException(status_code=404, detail=f"Schema not found: {request.schema_id}")

    pending_ids: list[str] = []
    ts = int(datetime.utcnow().timestamp() * 1000)

    for photo in request.photos:
        upload_id = f"upload_{ts}_{photo.photo_index}_{uuid.uuid4().hex[:6]}"
        blob_path = (
            f"{request.schema_id}/{request.farmer_id}/"
            f"{ts}_{photo.photo_index:02d}.jpg"
        )

        # Upload to Blob
        try:
            blob_url = _blob.upload_image(
                container    = "filled-forms",
                blob_path    = blob_path,
                image_base64 = photo.image_base64,
                content_type = photo.image_media_type,
            )
        except Exception as e:
            logger.error(f"Blob upload failed for photo {photo.photo_index}: {e}")
            raise HTTPException(status_code=500, detail=f"Blob upload failed: {e}")

        # Create pending record in Cosmos
        pending = PendingUpload(
            id            = upload_id,
            schema_id     = request.schema_id,
            farmer_id     = request.farmer_id,
            supervisor_id = request.supervisor_id,
            blob_url      = blob_url,
            blob_path     = blob_path,
            photo_index   = photo.photo_index,
        )
        _cosmos.save_pending(pending)
        pending_ids.append(upload_id)

    logger.info(f"Uploaded {len(pending_ids)} photos to Blob + pending queue")
    return UploadResponse(
        success        = True,
        uploaded_count = len(pending_ids),
        pending_ids    = pending_ids,
    )


# ── POST /api/form-intelligence/digitize ──────────────────────────────────────

@router.post("/digitize", response_model=DigitizeResponse)
async def digitize(request: DigitizetRequest):
    """
    Trigger digitization of all pending photos for a schema.
    Fetches photos from Blob → Vision API (parallel) → save records.
    """
    logger.info(
        f"POST /digitize | schema={request.schema_id} | "
        f"supervisor={request.supervisor_id} | batch_mode={request.batch_mode}"
    )
    try:
        response = await _reader_pipeline.run(
            schema_id     = request.schema_id,
            supervisor_id = request.supervisor_id,
            farmer_id     = request.farmer_id,
            batch_mode    = request.batch_mode,
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Digitize pipeline error")
        raise HTTPException(status_code=500, detail=f"Digitization failed: {str(e)}")


# ── GET /api/form-intelligence/schemas ────────────────────────────────────────

@router.get("/schemas", response_model=SchemasResponse)
async def list_schemas():
    """List all active form schemas."""
    schemas = _cosmos.list_schemas()
    return SchemasResponse(success=True, schemas=schemas)


# ── GET /api/form-intelligence/pending ────────────────────────────────────────

@router.get("/pending", response_model=PendingResponse)
async def get_pending(schema_id: str, farmer_id: str | None = None):
    """Count and list pending uploads for a schema."""
    uploads = _cosmos.get_pending(schema_id)
    if farmer_id:
        uploads = [u for u in uploads if u.farmer_id == farmer_id]
    return PendingResponse(success=True, count=len(uploads), uploads=uploads)
