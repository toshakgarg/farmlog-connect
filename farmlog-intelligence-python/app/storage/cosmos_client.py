"""
app/storage/cosmos_client.py
Azure Cosmos DB client — schemas, records, pending uploads.
Lazy initialization — connects on first use (serverless friendly).
"""

import logging
from azure.cosmos import CosmosClient, DatabaseProxy, ContainerProxy
from azure.cosmos.exceptions import CosmosResourceNotFoundError
from app.models.schema import FormSchema, FormRecord, PendingUpload, UploadStatus

logger = logging.getLogger(__name__)

SCHEMAS_CONTAINER  = "form-schemas"
RECORDS_CONTAINER  = "form-records"
PENDING_CONTAINER  = "pending-uploads"


class CosmosDB:
    def __init__(self, endpoint: str, key: str, database: str):
        self._endpoint = endpoint
        self._key      = key
        self._db_name  = database
        self._client:  CosmosClient  | None = None
        self._db:      DatabaseProxy | None = None
        self._schemas: ContainerProxy | None = None
        self._records: ContainerProxy | None = None
        self._pending: ContainerProxy | None = None

    def _init(self):
        if self._client:
            return
        self._client  = CosmosClient(self._endpoint, self._key)
        self._db      = self._client.create_database_if_not_exists(self._db_name)
        self._schemas = self._db.create_container_if_not_exists(
            id=SCHEMAS_CONTAINER, partition_key={"paths": ["/form_code"], "kind": "Hash"}
        )
        self._records = self._db.create_container_if_not_exists(
            id=RECORDS_CONTAINER, partition_key={"paths": ["/schema_id"], "kind": "Hash"}
        )
        self._pending = self._db.create_container_if_not_exists(
            id=PENDING_CONTAINER, partition_key={"paths": ["/schema_id"], "kind": "Hash"}
        )
        logger.info(f"CosmosDB initialized: {self._db_name}")

    # ── Schemas ───────────────────────────────────────────────────────────────

    def save_schema(self, schema: FormSchema) -> FormSchema:
        self._init()
        doc = schema.to_cosmos()
        self._schemas.upsert_item(doc)
        logger.info(f"Saved schema: {schema.id}")
        return schema

    def get_schema(self, schema_id: str) -> FormSchema | None:
        self._init()
        query = "SELECT * FROM c WHERE c.id = @id"
        params = [{"name": "@id", "value": schema_id}]
        items  = list(self._schemas.query_items(query=query, parameters=params, enable_cross_partition_query=True))
        if not items:
            return None
        try:
            return FormSchema.from_cosmos(items[0])
        except Exception as e:
            logger.error(f"Error parsing schema {schema_id}: {e}")
            return None

    def list_schemas(self, status: str = "active") -> list[FormSchema]:
        self._init()
        query  = "SELECT * FROM c WHERE c.type = 'form_schema' AND c.status = @status ORDER BY c.created_at DESC"
        params = [{"name": "@status", "value": status}]
        items  = list(self._schemas.query_items(query=query, parameters=params, enable_cross_partition_query=True))
        result = []
        for item in items:
            try:
                result.append(FormSchema.from_cosmos(item))
            except Exception as e:
                logger.warning(f"Skipping malformed schema doc {item.get('id')}: {e}")
        return result

    # ── Records ───────────────────────────────────────────────────────────────

    def save_record(self, record: FormRecord) -> FormRecord:
        self._init()
        self._records.upsert_item(record.to_cosmos())
        logger.info(f"Saved record: {record.id}")
        return record

    # ── Pending uploads ───────────────────────────────────────────────────────

    def save_pending(self, upload: PendingUpload) -> PendingUpload:
        self._init()
        self._pending.upsert_item(upload.to_cosmos())
        return upload

    def get_pending(self, schema_id: str, status: str = "pending") -> list[PendingUpload]:
        self._init()
        query  = "SELECT * FROM c WHERE c.schema_id = @sid AND c.status = @st ORDER BY c.uploaded_at ASC"
        params = [
            {"name": "@sid", "value": schema_id},
            {"name": "@st",  "value": status},
        ]
        items = list(self._pending.query_items(query=query, parameters=params, partition_key=schema_id))
        return [PendingUpload(**item) for item in items]

    def count_pending(self, schema_id: str) -> int:
        self._init()
        query  = "SELECT VALUE COUNT(1) FROM c WHERE c.schema_id = @sid AND c.status = 'pending'"
        params = [{"name": "@sid", "value": schema_id}]
        result = list(self._pending.query_items(query=query, parameters=params, partition_key=schema_id))
        return result[0] if result else 0

    def update_pending_status(
        self,
        upload_id: str,
        schema_id: str,
        status: UploadStatus,
        record_id: str | None = None,
        digitized_at: str | None = None,
    ):
        self._init()
        try:
            item = self._pending.read_item(item=upload_id, partition_key=schema_id)
            item["status"] = status.value
            if record_id:
                item["record_id"] = record_id
            if digitized_at:
                item["digitized_at"] = digitized_at
            self._pending.upsert_item(item)
        except CosmosResourceNotFoundError:
            logger.warning(f"Pending upload not found: {upload_id}")
