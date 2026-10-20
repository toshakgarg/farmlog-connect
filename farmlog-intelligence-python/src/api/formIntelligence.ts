/**
 * src/api/formIntelligence.ts
 * HTTP client for FarmLog Form Intelligence Python API.
 * Drop this into your farmlog-connect src/api/ folder.
 *
 * Endpoints (FastAPI on port 8000 locally):
 *   POST /api/form-intelligence/setup
 *   POST /api/form-intelligence/upload
 *   POST /api/form-intelligence/digitize
 *   GET  /api/form-intelligence/schemas
 *   GET  /api/form-intelligence/pending?schema_id=...
 */

const BASE_URL =
  (import.meta as any).env?.VITE_FORM_INTELLIGENCE_URL ?? "http://localhost:8000";

const API = `${BASE_URL}/api/form-intelligence`;

// ── Types (mirrors Python Pydantic models) ────────────────────────────────────

export interface FormField {
  key:      string;
  label:    string;
  type:     "text" | "number" | "date" | "checkbox" | "signature" | "table";
  section:  string;
  required: boolean;
}

export interface FieldValue {
  value:      string | null;
  confidence: number;
  source:     "handwriting" | "printed" | "checkbox" | "empty";
}

export interface LowConfidenceFlag {
  key:        string;
  label:      string;
  confidence: number;
  reason:     string;
}

export interface FormSchema {
  id:         string;
  form_title: string;
  form_code:  string;
  fields:     FormField[];
  sections:   string[];
  created_at: string;
  status:     string;
}

export interface SetupResponse {
  success:     boolean;
  schema_id:   string;
  form_title:  string;
  field_count: number;
  sections:    string[];
  schema:      FormSchema;
  error?:      string;
}

export interface UploadResponse {
  success:        boolean;
  uploaded_count: number;
  pending_ids:    string[];
  error?:         string;
}

export interface FormRecord {
  id:            string;
  schema_id:     string;
  farmer_id:     string;
  supervisor_id: string;
  submitted_at:  string;
  photo_count:   number;
  data:          Record<string, FieldValue>;
  flags:         LowConfidenceFlag[];
  status:        "complete" | "needs_review";
  blob_paths:    string[];
}

export interface DigitizeResponse {
  success:     boolean;
  record_id:   string;
  status:      "complete" | "needs_review";
  data:        Record<string, FieldValue>;
  flags:       LowConfidenceFlag[];
  photo_count: number;
  record?:     FormRecord;
  records?:    FormRecord[];
  error?:      string;
}

export interface PendingResponse {
  success: boolean;
  count:   number;
}

// ── Auth helper ───────────────────────────────────────────────────────────────

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("farmlog_auth_token") ?? "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fileToBase64(file: File): Promise<{ base64: string; media_type: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve({
      base64:     (reader.result as string).split(",")[1],
      media_type: file.type || "image/jpeg",
    });
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body:    JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
  return data as T;
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: authHeader() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data as T;
}

// ── Pipeline A: Admin setup ───────────────────────────────────────────────────

export async function setupForm(
  formImage: File,
  adminId: string,
  formCode?: string
): Promise<SetupResponse> {
  const { base64, media_type } = await fileToBase64(formImage);
  return apiPost<SetupResponse>("/setup", {
    image_base64:     base64,
    image_media_type: media_type,
    admin_id:         adminId,
    form_code:        formCode,
  });
}

// ── Pipeline B-1: Supervisor batch upload ─────────────────────────────────────

export async function uploadPhotos(
  photos: File[],
  schemaId: string,
  farmerId: string = "auto",
  supervisorId: string = "supervisor"
): Promise<UploadResponse> {
  const photoPayloads = await Promise.all(
    photos.map(async (file, idx) => {
      const { base64, media_type } = await fileToBase64(file);
      return { image_base64: base64, image_media_type: media_type, photo_index: idx };
    })
  );
  return apiPost<UploadResponse>("/upload", {
    photos:        photoPayloads,
    schema_id:     schemaId,
    farmer_id:     farmerId || "auto",
    supervisor_id: supervisorId,
  });
}

// ── Pipeline B-2: Digitize on demand ─────────────────────────────────────────

export async function digitizeAll(
  schemaId: string,
  supervisorId: string = "supervisor",
  farmerId?: string,
  batchMode: boolean = true
): Promise<DigitizeResponse> {
  return apiPost<DigitizeResponse>("/digitize", {
    schema_id:     schemaId,
    supervisor_id: supervisorId,
    farmer_id:     farmerId,
    batch_mode:    batchMode,
  });
}

// ── Utility ───────────────────────────────────────────────────────────────────

export async function listSchemas(): Promise<FormSchema[]> {
  const data = await apiGet<{ schemas: FormSchema[] }>("/schemas");
  return data.schemas;
}

export async function getPendingCount(schemaId: string): Promise<number> {
  const data = await apiGet<PendingResponse>(`/pending?schema_id=${schemaId}`);
  return data.count;
}
