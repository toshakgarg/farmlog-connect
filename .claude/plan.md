# Form Intelligence Multi-Provider & Digitization Workflow Plan

## Goal
1. Update `farmlog-intelligence-python` backend to support **Multi-Provider AI Vision** (Google Gemini, OpenAI, Azure Vision, Claude Vision) so paper form scanning works without requiring a paid Claude Vision subscription.
2. Provide **Google Gemini 1.5 Flash / 2.0** as a free-tier default option, along with **OpenAI (gpt-4o-mini)** and **Azure Vision**.
3. Complete the **Admin & Supervisor workflow**:
   - **Admin**: Upload blank form → Scan & extract key-value question pairs → Assign & save Form ID / Schema ID.
   - **Supervisor**: Upload filled form photos in chunks → Select Form ID → Click scan/digitize → Preview results → **Download CSV file** → **Supervisor Approval & Save to Database**.

---

## Architecture & Implementation Strategy

### 1. Python Backend Multi-Provider Support (`farmlog-intelligence-python`)

#### `requirements.txt`
Add multi-provider dependencies:
- `openai>=1.50`
- `google-genai>=0.1.0` (or `google-generativeai>=0.8.0`)

#### Unified Vision Agent Architecture (`app/agents/`)
- Abstract vision agents so `SetupAgent` and `ReaderAgent` can dispatch to the active provider specified by `VISION_PROVIDER` (`gemini`, `openai`, `azure`, `anthropic`).
- Implement Gemini Vision Agent (`gemini-1.5-flash`):
  - Free tier available via Google AI Studio API key (`GEMINI_API_KEY`).
  - Supports structured JSON outputs for form key-values, Hindi/English handwriting, and confidence scoring.
- Implement OpenAI Vision Agent (`gpt-4o-mini` / `gpt-4o`):
  - Extremely cheap ($0.0003/image for gpt-4o-mini) and high accuracy for tables & handwritten text.
  - Uses `OPENAI_API_KEY`.
- Implement Azure Vision + LLM fallback / Anthropic agent.
- Agent Factory (`app/agents/factory.py`):
  - Dynamically instantiates the appropriate agent based on `VISION_PROVIDER` env setting.

#### Environment Configuration (`.env.example` & `app/main.py`)
- Add `VISION_PROVIDER` (default: `gemini` or `openai`).
- Gracefully log active provider and missing keys on startup.

---

### 2. Frontend Workflows & CSV Export (`farmlog-connect`)

#### Supervisor Workflow (`src/components/FormPaperReader.tsx`)
- **Chunked Photo Upload**: Supervisor selects Form ID (Schema ID) & uploads 1-N photos.
- **Digitization & Preview**: Shows extracted key-value pairs with confidence badges and flags (<60%).
- **CSV Download Button**:
  - Adds a "Download CSV" button that exports all digitized key-value form fields as a clean CSV file.
- **Supervisor Approval & Database Sync**:
  - Adds an "Approve & Save to Database" button.
  - Converts digitized key-value fields into a `FarmerRecord` or `JOITAPerforma` and stores it via `saveRecordLocalFirst` into Cosmos DB and IndexedDB.

#### Admin Workflow (`src/components/FormTemplateSetup.tsx`)
- Admin uploads blank paper form image.
- System scans and extracts key-value questions, title, sections, and assigns a unique Form ID / Schema ID.
- Displays Form ID prominently with a 1-click copy button and quick-view of extracted questions.
- Lists all active form templates stored in database.

---

## Verification Plan
1. Test Python backend startup with `VISION_PROVIDER=gemini` and `VISION_PROVIDER=openai`.
2. Verify Admin template creation flow (blank form image -> Schema ID + field list).
3. Verify Supervisor batch upload -> digitization -> CSV generation -> approval & database save.
4. Verify offline fallback behavior.
