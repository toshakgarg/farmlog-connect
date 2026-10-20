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
    ) -> DigitizeResponse:
        """
        Run the full digitization pipeline for all pending uploads.
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

        # Filter by farmer if specified
        if farmer_id:
            pending = [p for p in pending if p.farmer_id == farmer_id]

        logger.info(f"Found {len(pending)} pending photos to digitize")

        # ── Step 3: Mark all as processing ───────────────────────────────────
        for upload in pending:
            self.cosmos.update_pending_status(
                upload.id, schema_id, UploadStatus.PROCESSING
            )

        # ── Step 4: Download + read all photos in parallel ───────────────────
        logger.info(f"ReaderPipeline step 3/5: reading {len(pending)} photos in parallel")

        async def process_one(upload: PendingUpload) -> list[dict] | None:
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
                return result["pairs"]

            except Exception as e:
                logger.error(f"  ✗ Photo {upload.photo_index} failed: {e}")
                return None

        results = await asyncio.gather(*[process_one(u) for u in pending])

        # Collect successful reads
        successful_pairs: list[list[dict]] = [r for r in results if r is not None]
        failed_count = len(results) - len(successful_pairs)

        if not successful_pairs:
            raise RuntimeError(f"All {len(pending)} photos failed to process.")

        logger.info(
            f"ReaderPipeline: {len(successful_pairs)}/{len(pending)} photos read successfully"
            + (f", {failed_count} failed" if failed_count else "")
        )

        # ── Step 5: Merge + validate ──────────────────────────────────────────
        logger.info("ReaderPipeline step 4/5: merging and validating")
        merged = merge_and_validate(
            all_photo_pairs=successful_pairs,
            schema_fields=schema.fields,
            confidence_threshold=self.threshold,
        )

        # ── Step 6: Save record ───────────────────────────────────────────────
        logger.info("ReaderPipeline step 5/5: saving record to Cosmos DB")
        record_id = generate_record_id(schema_id)
        resolved_farmer = farmer_id or (pending[0].farmer_id if pending else "unknown")

        record = FormRecord(
            id            = record_id,
            schema_id     = schema_id,
            farmer_id     = resolved_farmer,
            supervisor_id = supervisor_id,
            submitted_at  = datetime.utcnow().isoformat(),
            photo_count   = len(pending),
            data          = merged["data"],
            flags         = merged["flags"],
            status        = merged["status"],
            blob_paths    = [u.blob_path for u in pending],
        )

        saved = self.cosmos.save_record(record)

        # ── Step 7: Mark pending uploads as done ─────────────────────────────
        for upload in pending:
            self.cosmos.update_pending_status(
                upload.id,
                schema_id,
                UploadStatus.DONE,
                record_id=record_id,
                digitized_at=datetime.utcnow().isoformat(),
            )

        duration = (datetime.utcnow() - start).total_seconds()
        logger.info(
            f"ReaderPipeline complete: "
            f"record_id={record_id}, "
            f"status={saved.status}, "
            f"flags={len(saved.flags)}, "
            f"avg_confidence={merged['stats']['avg_confidence']}%, "
            f"duration={duration:.1f}s"
        )

        return DigitizeResponse(
            success     = True,
            record_id   = saved.id,
            status      = saved.status,
            data        = saved.data,
            flags       = saved.flags,
            photo_count = saved.photo_count,
            record      = saved,
        )
