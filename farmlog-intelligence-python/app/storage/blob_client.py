"""
app/storage/blob_client.py
Azure Blob Storage client for form images.
"""

import base64
import logging
from azure.storage.blob import BlobServiceClient, ContentSettings

logger = logging.getLogger(__name__)

CONTAINER_BLANK  = "blank-forms"
CONTAINER_FILLED = "filled-forms"


class BlobStorage:
    def __init__(self, connection_string: str):
        self._conn_str = connection_string
        self._client: BlobServiceClient | None = None

    def _init(self):
        if self._client:
            return
        self._client = BlobServiceClient.from_connection_string(self._conn_str)
        for container in [CONTAINER_BLANK, CONTAINER_FILLED]:
            try:
                self._client.create_container(container)
                logger.info(f"Created container: {container}")
            except Exception:
                pass  # already exists

    def upload_image(
        self,
        container: str,
        blob_path: str,
        image_base64: str,
        content_type: str = "image/jpeg",
    ) -> str:
        """Upload base64 image to Blob. Returns the full blob URL."""
        self._init()
        image_bytes = base64.b64decode(image_base64)
        blob_client = self._client.get_blob_client(container=container, blob=blob_path)
        blob_client.upload_blob(
            image_bytes,
            overwrite=True,
            content_settings=ContentSettings(content_type=content_type),
        )
        url = blob_client.url
        logger.info(f"Uploaded {len(image_bytes)/1024:.1f}KB to {container}/{blob_path}")
        return url

    def download_image(self, container: str, blob_path: str) -> tuple[bytes, str]:
        """Download blob. Returns (bytes, content_type)."""
        self._init()
        blob_client  = self._client.get_blob_client(container=container, blob=blob_path)
        downloader   = blob_client.download_blob()
        data         = downloader.readall()
        content_type = downloader.properties.content_settings.content_type or "image/jpeg"
        logger.info(f"Downloaded {len(data)/1024:.1f}KB from {container}/{blob_path}")
        return data, content_type
