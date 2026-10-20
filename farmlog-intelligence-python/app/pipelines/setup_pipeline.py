"""
app/pipelines/setup_pipeline.py
Setup Pipeline — orchestrates blank form → schema creation.

Pipeline steps:
  1. Validate image
  2. Upload blank form to Blob Storage
  3. Run SetupAgent (Claude Vision reads fields)
  4. Build FormSchema document
  5. Save schema to Cosmos DB
  6. Return SetupResponse
"""

import logging
from datetime import datetime

from app.agents.setup_agent import SetupAgent
from app.models.schema import FormField, FormSchema, SetupResponse
from app.storage.cosmos_client import CosmosDB
from app.storage.blob_client import BlobStorage
from app.utils.image_utils import validate_image

logger = logging.getLogger(__name__)


def generate_schema_id(form_code: str) -> str:
    slug = form_code.lower().replace(" ", "_").replace("-", "_")[:20]
    ts   = int(datetime.utcnow().timestamp() * 1000)
    return f"schema_{slug}_{ts}"


class SetupPipeline:
    """
    Orchestrates blank form → schema pipeline.
    Called once per form type by Admin.
    """

    def __init__(
        self,
        setup_agent: SetupAgent,
        cosmos: CosmosDB,
        blob: BlobStorage,
    ):
        self.agent  = setup_agent
        self.cosmos = cosmos
        self.blob   = blob

    async def run(
        self,
        image_base64: str,
        image_media_type: str,
        admin_id: str,
        form_code: str | None = None,
    ) -> SetupResponse:
        """
        Run the full setup pipeline.
        Returns SetupResponse with schema_id, field_count, and full schema.
        """
        start = datetime.utcnow()

        # ── Step 1: Validate ─────────────────────────────────────────────────
        logger.info("SetupPipeline step 1/4: validating image")
        validate_image(image_base64, max_size_mb=10.0)

        # ── Step 2: Run Setup Agent (Claude Vision) ──────────────────────────
        logger.info("SetupPipeline step 2/4: running SetupAgent")
        extracted = await self.agent.extract_schema(image_base64, image_media_type)

        if not extracted["fields"]:
            raise ValueError("No fields found in the uploaded form. Check image quality.")

        # ── Step 3: Upload blank form to Blob Storage ─────────────────────────
        resolved_code = form_code or extracted["form_code"] or f"form_{int(datetime.utcnow().timestamp())}"
        blob_path     = f"{resolved_code.upper()}.jpg"

        logger.info(f"SetupPipeline step 3/4: uploading blank form to Blob → blank-forms/{blob_path}")
        try:
            self.blob.upload_image(
                container="blank-forms",
                blob_path=blob_path,
                image_base64=image_base64,
                content_type=image_media_type,
            )
        except Exception as e:
            logger.warning(f"Blob upload failed (non-fatal): {e}")

        # ── Step 4: Build and save schema ─────────────────────────────────────
        schema_id = generate_schema_id(resolved_code)

        schema = FormSchema(
            id         = schema_id,
            form_title = extracted["form_title"],
            form_code  = resolved_code,
            fields     = extracted["fields"],
            sections   = extracted["sections"],
            created_by = admin_id,
            created_at = datetime.utcnow().isoformat(),
        )

        logger.info(f"SetupPipeline step 4/4: saving schema {schema_id} to Cosmos DB")
        saved = self.cosmos.save_schema(schema)

        duration = (datetime.utcnow() - start).total_seconds()
        logger.info(
            f"SetupPipeline complete: "
            f"form='{saved.form_title}', "
            f"schema_id={saved.id}, "
            f"fields={len(saved.fields)}, "
            f"duration={duration:.1f}s"
        )

        return SetupResponse(
            success     = True,
            schema_id   = saved.id,
            form_title  = saved.form_title,
            field_count = len(saved.fields),
            sections    = saved.sections,
            schema_obj  = saved,
        )
