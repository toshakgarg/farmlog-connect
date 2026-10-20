"""
app/main.py
FarmLog Form Intelligence — FastAPI application entry point.

Wires together:
  - Config (from .env)
  - Storage clients (Cosmos DB, Blob Storage)
  - AI agents (SetupAgent, ReaderAgent)
  - Pipelines (SetupPipeline, ReaderPipeline)
  - FastAPI routes
  - CORS middleware
"""

import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agents.setup_agent import SetupAgent
from app.agents.reader_agent import ReaderAgent
from app.pipelines.setup_pipeline import SetupPipeline
from app.pipelines.reader_pipeline import ReaderPipeline
from app.storage.cosmos_client import CosmosDB
from app.storage.blob_client import BlobStorage
from app.api.routes import router, set_dependencies

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


def build_app() -> FastAPI:
    # ── Config ────────────────────────────────────────────────────────────────
    vision_provider = os.getenv("VISION_PROVIDER", "gemini").lower()
    cosmos_endpoint = os.getenv("COSMOS_ENDPOINT", "https://localhost:8081")
    cosmos_key      = os.getenv("COSMOS_KEY", "C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==")
    cosmos_db       = os.getenv("COSMOS_DATABASE", "form-intelligence")
    storage_conn    = os.getenv("AZURE_STORAGE_CONNECTION_STRING", "")
    allowed_origins = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:8080,http://localhost:5173,http://localhost:3000,https://farmlog-connect.vercel.app"
    ).split(",")
    confidence_threshold = int(os.getenv("CONFIDENCE_THRESHOLD", "60"))

    # ── Storage clients ───────────────────────────────────────────────────────
    cosmos = CosmosDB(cosmos_endpoint, cosmos_key, cosmos_db)
    blob   = BlobStorage(storage_conn)

    # ── AI agents (Multi-Provider Support) ────────────────────────────────────
    anthropic_client = None
    if vision_provider == "anthropic":
        import anthropic
        anthropic_key = os.getenv("ANTHROPIC_API_KEY", "")
        if anthropic_key:
            anthropic_client = anthropic.Anthropic(api_key=anthropic_key)

    setup_agent  = SetupAgent(client=anthropic_client, provider=vision_provider)
    reader_agent = ReaderAgent(client=anthropic_client, provider=vision_provider)

    # ── Pipelines ─────────────────────────────────────────────────────────────
    setup_pipeline  = SetupPipeline(setup_agent, cosmos, blob)
    reader_pipeline = ReaderPipeline(reader_agent, cosmos, blob, confidence_threshold)

    # ── Wire into routes ──────────────────────────────────────────────────────
    set_dependencies(setup_pipeline, reader_pipeline, cosmos, blob)

    # ── FastAPI app ───────────────────────────────────────────────────────────
    app = FastAPI(
        title       = "FarmLog Form Intelligence",
        description = "Digitizes paper forms using AI Vision (Gemini / OpenAI / Claude)",
        version     = "1.0.0",
        docs_url    = "/docs",
        redoc_url   = "/redoc",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins     = [o.strip() for o in allowed_origins],
        allow_credentials = True,
        allow_methods     = ["*"],
        allow_headers     = ["*"],
    )

    app.include_router(router)

    @app.get("/health")
    async def health():
        return {
            "status": "ok",
            "provider": vision_provider,
            "service": "FarmLog Form Intelligence",
        }

    logger.info(f"App built | provider={vision_provider} | origins={allowed_origins}")
    return app


app = build_app()
