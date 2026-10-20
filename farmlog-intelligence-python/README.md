# FarmLog Form Intelligence — Python Pipeline Service

A FastAPI + Python service that digitizes paper forms using Claude Vision AI.
Written in the style of a Data Science / AI Engineer — clean agents, typed models, async pipelines.

## Architecture

```
farmlog-connect (React, Vercel)
        │
        │  POST /api/form-intelligence/setup      ← Admin uploads blank form
        │  POST /api/form-intelligence/upload      ← Supervisor uploads filled photos (batch)
        │  POST /api/form-intelligence/digitize    ← Trigger digitization pipeline
        │  GET  /api/form-intelligence/schemas     ← List available form templates
        │  GET  /api/form-intelligence/pending     ← Check pending uploads count
        ▼
FastAPI (Python 3.11+)
        │
        ├── Setup Agent      → Claude Vision reads blank form → schema → Cosmos DB
        ├── Upload Agent     → Photos → Azure Blob Storage → pending queue
        └── Reader Agent     → Fetch pending → Claude Vision (parallel) → merge → Cosmos DB
```

## Stack

- **FastAPI** — async HTTP API
- **Anthropic SDK (Python)** — Claude Vision for form reading
- **Azure Cosmos DB** — schemas, records, pending queue
- **Azure Blob Storage** — form images
- **Pydantic** — all data models typed and validated
- **asyncio** — parallel photo processing
- **Pillow** — image preprocessing (resize, enhance contrast)
- **python-dotenv** — local environment config

## Quickstart

```bash
cd farmlog-intelligence-python
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env           # fill in your keys
uvicorn app.main:app --reload --port 8000
```

## Endpoints

```
POST /api/form-intelligence/setup
POST /api/form-intelligence/upload
POST /api/form-intelligence/digitize
GET  /api/form-intelligence/schemas
GET  /api/form-intelligence/pending?schema_id=...
GET  /health
GET  /docs        (Swagger UI — auto-generated)
```

## Project Structure

```
app/
  main.py              FastAPI app + CORS + router registration
  models/
    schema.py          Pydantic models — FormField, FormSchema, FormRecord, etc.
  agents/
    setup_agent.py     Reads blank form → extracts schema using Claude Vision
    reader_agent.py    Reads filled form → extracts values using Claude Vision
    validator.py       Merges multi-photo results + flags low confidence
  pipelines/
    setup_pipeline.py  Orchestrates: image → agent → cosmos
    reader_pipeline.py Orchestrates: fetch pending → agent (parallel) → merge → cosmos
  storage/
    cosmos_client.py   Cosmos DB operations (schemas, records, pending)
    blob_client.py     Azure Blob Storage operations
  api/
    routes.py          All FastAPI route handlers
  utils/
    image_utils.py     Base64 encode/decode, resize, validate
    logging.py         Structured logging
tests/
  test_agents.py
  test_pipelines.py
```
