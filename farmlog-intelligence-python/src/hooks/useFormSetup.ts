/**
 * src/hooks/useFormSetup.ts
 * React hook — Admin: Setup Pipeline (blank form → schema)
 */

import { useState, useCallback } from "react";
import { setupForm, SetupResponse } from "../api/formIntelligence";

export type SetupStage = "idle" | "reading" | "building" | "saving" | "done" | "error";

export interface UseFormSetupReturn {
  stage:    SetupStage;
  progress: number;
  result:   SetupResponse | null;
  error:    string | null;
  run:   (file: File, adminId: string, formCode?: string) => Promise<void>;
  reset: () => void;
}

export function useFormSetup(): UseFormSetupReturn {
  const [stage,    setStage]    = useState<SetupStage>("idle");
  const [progress, setProgress] = useState(0);
  const [result,   setResult]   = useState<SetupResponse | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const run = useCallback(async (file: File, adminId: string, formCode?: string) => {
    setStage("reading");
    setProgress(10);
    setError(null);
    setResult(null);

    const tick = setInterval(() => setProgress(p => Math.min(p + 6, 88)), 1000);

    try {
      setStage("building");
      const response = await setupForm(file, adminId, formCode);
      clearInterval(tick);
      setProgress(100);
      setStage("done");
      setResult(response);
      // Store last schema id for supervisor convenience
      localStorage.setItem("farmlog_last_schema_id", response.schema_id);
    } catch (err: unknown) {
      clearInterval(tick);
      setStage("error");
      setProgress(0);
      setError(err instanceof Error ? err.message : "Setup failed");
    }
  }, []);

  const reset = useCallback(() => {
    setStage("idle"); setProgress(0); setResult(null); setError(null);
  }, []);

  return { stage, progress, result, error, run, reset };
}
