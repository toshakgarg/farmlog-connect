"""
app/pipelines/reader_pipeline.py
Reader Pipeline — fetches all pending photos, runs Claude Vision in parallel,
merges results, saves record to Cosmos DB.

Pipeline steps:
  1. Fetch schema from Cosmos DB
  2. Fetch all pending uploads for this schema
  3. Download each photo from Blob Storage
  4. Run ReaderAgent on all photos in parallel (asyncio.gather)
  5. Merge + validate results via Validator
  6. Save FormRecord to Cosmos DB
  7. Mark all pending uploads as done
  8. Return DigitizeResponse
"""

import asyncio
import logging
from datetime import datetime

from app.agents.reader_agent import ReaderAgent
from app.agents.validator import merge_and_validate
from app.models.schema import (
    FormRecord, DigitizeResponse, PendingUpload, UploadStatus
)
from app.storage.cosmos_client import CosmosDB
from app.storage.blob_client import BlobStorage
from app.utils.image_utils import image_bytes_to_base64

logger = logging.getLogger(__name__)


def generate_record_id(schema_id: str) -> str:
    suffix = schema_id[-8:] if len(schema_id) > 8 else schema_id
    ts     = int(datetime.utcnow().timestamp() * 1000)
    return f"rec_{suffix}_{ts}"


class ReaderPipeline:
    """
    Orchestrates the batch digitization pipeline.
    Called when supervisor clicks 'Digitize All'.
    """

    def __init__(
        self,
        reader_agent: ReaderAgent,
        cosmos: CosmosDB,
        blob: BlobStorage,
        confidence_threshold: int = 60,
    ):
        self.agent      = reader_agent
        self.cosmos     = cosmos
        self.blob       = blob
        self.threshold  = confidence_threshold

    async def run(
        self,
        schema_id: str,
        supervisor_id: str,
        farmer_id: str | None = None,
        batch_mode: bool = True,
    ) -> DigitizeResponse:
        """
        Run the full digitization pipeline for all pending uploads.
        If batch_mode=True, creates 1 FormRecord per photo.
        If batch_mode=False, combines all photos into 1 multi-page FormRecord.
        """
        start = datetime.utcnow()

        # ── Step 1: Load schema ───────────────────────────────────────────────
        logger.info(f"ReaderPipeline step 1/5: loading schema {schema_id}")
        schema = self.cosmos.get_schema(schema_id)
        if not schema:
            raise ValueError(f"Schema not found: {schema_id}. Run setup pipeline first.")

        logger.info(f"Schema loaded: '{schema.form_title}', {len(schema.fields)} fields")

        # ── Step 2: Fetch pending uploads ────────────────────────────────────
        logger.info("ReaderPipeline step 2/5: fetching pending uploads")
        pending = self.cosmos.get_pending(schema_id, status="pending")

        if not pending:
            raise ValueError(f"No pending uploads found for schema {schema_id}.")

        # Filter by farmer if specified and not default "auto"
        if farmer_id and farmer_id != "auto":
            pending = [p for p in pending if p.farmer_id == farmer_id]

        logger.info(f"Found {len(pending)} pending photos to digitize (batch_mode={batch_mode})")

        # ── Step 3: Mark all as processing ───────────────────────────────────
        for upload in pending:
            self.cosmos.update_pending_status(
                upload.id, schema_id, UploadStatus.PROCESSING
            )

        # ── Step 4: Download + read all photos in parallel ───────────────────
        logger.info(f"ReaderPipeline step 3/5: reading {len(pending)} photos in parallel")

        async def process_one(upload: PendingUpload) -> tuple[PendingUpload, list[dict] | None]:
            try:
                # Download from Blob Storage
                image_bytes, content_type = self.blob.download_image(
                    container="filled-forms",
                    blob_path=upload.blob_path,
                )
                image_b64, media_type = image_bytes_to_base64(image_bytes)

                # Run Reader Agent
                result = await self.agent.read_form(image_b64, media_type, schema.fields)

                logger.info(
                    f"  ✓ Photo {upload.photo_index}: "
                    f"{len([p for p in result['pairs'] if p.get('value')])} values read "
                    f"(quality: {result['image_quality']})"
                )
                return (upload, result["pairs"])

                except Exception as e:
                logger.error(f"  ✗ Photo {upload.photo_index} failed: {e}")
                return (upload, None)

        processed_results = await asyncio.gather(*[process_one(u) for u in pending])

        successful = [(upload, pairs) for upload, pairs in processed_results if pairs is not None]
        failed_count = len(processed_results) - len(successful)

        if not successful:
            raise RuntimeError(f"All {len(pending)} photos failed to process.")

        logger.info(
            f"ReaderPipeline: {len(successful)}/{len(pending)} photos read successfully"
            + (f", {failed_count} failed" if failed_count else "")
        )

        saved_records: list[FormRecord] = []

        if batch_mode or len(successful) == 1:
            # ── Mode A: Process each photo as its OWN separate FormRecord ─────
            logger.info("ReaderPipeline step 4/5 (Batch Mode): creating individual records per form photo")
            for upload, pairs in successful:
                merged = merge_and_validate(
                    all_photo_pairs=[pairs],
                    schema_fields=schema.fields,
                    confidence_threshold=self.threshold,
                )

                # Auto-detect farmer name/ID if present in extracted data
                extracted_farmer = None
                for key_candidate in ["farmer_name", "farmer_id", "farmer_mobile", "mobile_number"]:
                    if key_candidate in merged["data"] and merged["data"][key_candidate].value:
                        extracted_farmer = str(merged["data"][key_candidate].value)
                        break

                resolved_farmer = extracted_farmer or (
                    upload.farmer_id if upload.farmer_id != "auto" else f"farmer_{upload.photo_index + 1}"
                )

                rec_id = generate_record_id(schema_id)
                record = FormRecord(
                    id            = rec_id,
                    schema_id     = schema_id,
                    farmer_id     = resolved_farmer,
                    supervisor_id = supervisor_id,
                    submitted_at  = datetime.utcnow().isoformat(),
                    photo_count   = 1,
                    data          = merged["data"],
                    flags         = merged["flags"],
                    status        = merged["status"],
                    blob_paths    = [upload.blob_path],
                )

                saved = self.cosmos.save_record(record)
                saved_records.append(saved)

                self.cosmos.update_pending_status(
                    upload.id,
                    schema_id,
                    UploadStatus.DONE,
                    record_id=rec_id,
                    digitized_at=datetime.utcnow().isoformat(),
                )

        else:
            # ── Mode B: Combine ALL photos into 1 multi-page FormRecord ────────
            logger.info("ReaderPipeline step 4/5 (Multi-page Mode): merging all photos into 1 record")
            all_pairs = [pairs for _, pairs in successful]
            merged = merge_and_validate(
                all_photo_pairs=all_pairs,
                schema_fields=schema.fields,
                confidence_threshold=self.threshold,
            )

            rec_id = generate_record_id(schema_id)
            resolved_farmer = (
                farmer_id if (farmer_id and farmer_id != "auto")
                else pending[0].farmer_id if pending[0].farmer_id != "auto"
                else "multi_page_farmer"
            )

            record = FormRecord(
                id            = rec_id,
                schema_id     = schema_id,
                farmer_id     = resolved_farmer,
                supervisor_id = supervisor_id,
                submitted_at  = datetime.utcnow().isoformat(),
                photo_count   = len(successful),
                data          = merged["data"],
                flags         = merged["flags"],
                status        = merged["status"],
                blob_paths    = [u.blob_path for u, _ in successful],
            )

            saved = self.cosmos.save_record(record)
            saved_records.append(saved)

            for u, _ in successful:
                self.cosmos.update_pending_status(
                    u.id,
                    schema_id,
                    UploadStatus.DONE,
                    record_id=rec_id,
                    digitized_at=datetime.utcnow().isoformat(),
                )

        primary = saved_records[0]
        duration = (datetime.utcnow() - start).total_seconds()
        logger.info(
            f"ReaderPipeline complete: "
            f"created {len(saved_records)} record(s), "
            f"primary_id={primary.id}, "
            f"duration={duration:.1f}s"
        )

        return DigitizeResponse(
            success     = True,
            record_id   = primary.id,
            status      = primary.status,
            data        = primary.data,
            flags       = primary.flags,
            photo_count = primary.photo_count,
            record      = primary,
            records     = saved_records,
        )
