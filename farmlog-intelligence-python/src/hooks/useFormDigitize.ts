/**
 * src/hooks/useFormDigitize.ts
 * React hook — Supervisor: two-step batch pipeline
 *
 * Step 1: upload(photos)  → photos go to Blob Storage, status = "pending"
 * Step 2: digitize()      → fetches all pending, runs Claude Vision, saves record
 *
 * The two steps can happen at different times / different sessions.
 */

import { useState, useCallback } from "react";
import {
  uploadPhotos,
  digitizeAll,
  getPendingCount,
  DigitizeResponse,
  UploadResponse,
} from "../api/formIntelligence";

export type DigitizerStage =
  | "idle"
  | "uploading"   // converting + sending photos to Blob
  | "uploaded"    // photos stored, waiting for digitize
  | "digitizing"  // Claude Vision running
  | "done"
  | "error";

export interface UseFormDigitizeReturn {
  stage:          DigitizerStage;
  progress:       number;
  uploadResult:   UploadResponse   | null;
  digitizeResult: DigitizeResponse | null;
  pendingCount:   number;
  error:          string | null;
  upload:   (photos: File[], schemaId: string, farmerId?: string, supervisorId?: string) => Promise<void>;
  digitize: (schemaId: string, supervisorId?: string, farmerId?: string, batchMode?: boolean) => Promise<void>;
  loadPending: (schemaId: string) => Promise<void>;
  reset:    () => void;
}

export function useFormDigitize(): UseFormDigitizeReturn {
  const [stage,          setStage]          = useState<DigitizerStage>("idle");
  const [progress,       setProgress]       = useState(0);
  const [uploadResult,   setUploadResult]   = useState<UploadResponse   | null>(null);
  const [digitizeResult, setDigitizeResult] = useState<DigitizeResponse | null>(null);
  const [pendingCount,   setPendingCount]   = useState(0);
  const [error,          setError]          = useState<string | null>(null);

  // ── Step 1: Upload photos to Blob Storage ──────────────────────────────────
  const upload = useCallback(async (
    photos: File[],
    schemaId: string,
    farmerId: string = "auto",
    supervisorId: string = "supervisor",
  ) => {
    setStage("uploading");
    setProgress(5);
    setError(null);

    const tick = setInterval(() => setProgress(p => Math.min(p + 10, 90)), 600);
    try {
      const response = await uploadPhotos(photos, schemaId, farmerId || "auto", supervisorId);
      clearInterval(tick);
      setProgress(100);
      setStage("uploaded");
      setUploadResult(response);
      setPendingCount(c => c + response.uploaded_count);
    } catch (err: unknown) {
      clearInterval(tick);
      setStage("error");
      setProgress(0);
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }, []);

  // ── Step 2: Digitize all pending photos ────────────────────────────────────
  const digitize = useCallback(async (
    schemaId: string,
    supervisorId: string = "supervisor",
    farmerId?: string,
    batchMode: boolean = true,
  ) => {
    setStage("digitizing");
    setProgress(10);
    setError(null);

    const tick = setInterval(() => setProgress(p => Math.min(p + 4, 88)), 1200);
    try {
      const response = await digitizeAll(schemaId, supervisorId, farmerId, batchMode);
      clearInterval(tick);
      setProgress(100);
      setStage("done");
      setDigitizeResult(response);
      setPendingCount(0);
    } catch (err: unknown) {
      clearInterval(tick);
      setStage("error");
      setProgress(0);
      setError(err instanceof Error ? err.message : "Digitization failed");
    }
  }, []);

  // ── Load pending count (call on mount or schema change) ────────────────────
  const loadPending = useCallback(async (schemaId: string) => {
    try {
      const count = await getPendingCount(schemaId);
      setPendingCount(count);
      if (count > 0 && stage === "idle") setStage("uploaded");
    } catch {
      // non-fatal
    }
  }, [stage]);

  const reset = useCallback(() => {
    setStage("idle"); setProgress(0);
    setUploadResult(null); setDigitizeResult(null);
    setPendingCount(0); setError(null);
  }, []);

  return {
    stage, progress, uploadResult, digitizeResult,
    pendingCount, error, upload, digitize, loadPending, reset,
  };
}
