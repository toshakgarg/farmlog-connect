import React, { useState, useEffect } from "react";
import {
  Upload,
  AlertCircle,
  CheckCircle,
  Loader2,
  PlayCircle,
  X,
  Download,
  Database,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { useFormDigitize } from "../hooks/useFormDigitize";
import { listSchemas, FormSchema } from "../api/formIntelligence";
import { useAuth } from "../lib/auth";
import { useI18n } from "../lib/i18n";
import { downloadCsv, saveRecordLocalFirst, saveJOITAPerforma } from "../lib/data";
import { newLocalId } from "../lib/offline";

interface Props {
  farmers: { id: string; fullName?: string; name?: string }[];
  onCancel: () => void;
}

export function FormPaperReader({ farmers, onCancel }: Props) {
  const { lang } = useI18n();
  const { profile } = useAuth();

  const [schemas, setSchemas] = useState<FormSchema[]>([]);
  const [loadingSchemas, setLoadingSchemas] = useState(true);
  const [selectedSchema, setSelectedSchema] = useState<string>("");
  const [selectedFarmer, setSelectedFarmer] = useState<string>("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [savingDb, setSavingDb] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const {
    stage,
    progress,
    uploadResult,
    digitizeResult,
    pendingCount,
    error,
    upload,
    digitize,
    loadPending,
    reset,
  } = useFormDigitize();

  useEffect(() => {
    async function load() {
      setLoadingSchemas(true);
      try {
        const data = await listSchemas();
        setSchemas(data);
        if (data.length > 0 && data[0]) {
          const lastId = localStorage.getItem("farmlog_last_schema_id") || data[0].id;
          const found = data.find((s) => s.id === lastId);
          if (found) setSelectedSchema(found.id);
          else setSelectedSchema(data[0].id);
        }
      } catch (err) {
        console.error("Failed to list schemas", err);
      } finally {
        setLoadingSchemas(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (selectedSchema) {
      localStorage.setItem("farmlog_last_schema_id", selectedSchema);
      loadPending(selectedSchema);
    }
  }, [selectedSchema, loadPending]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const valid = newFiles.filter(
        (f) => ["image/jpeg", "image/png"].includes(f.type) && f.size <= 10 * 1024 * 1024,
      );
      setPhotos(valid);
    }
  };

  const [batchMode, setBatchMode] = useState<boolean>(true);

  const doUpload = async () => {
    if (!selectedSchema || photos.length === 0) return;
    await upload(photos, selectedSchema, selectedFarmer || "auto", profile?.uid || "supervisor");
    setPhotos([]);
  };

  const doDigitize = async () => {
    if (!selectedSchema) return;
    setSavedSuccess(false);
    await digitize(selectedSchema, profile?.uid || "supervisor", selectedFarmer || undefined, batchMode);
  };

  const handleDownloadCsv = () => {
    if (!digitizeResult) return;

    const records = digitizeResult.records && digitizeResult.records.length > 0
      ? digitizeResult.records
      : digitizeResult.record
      ? [digitizeResult.record]
      : [];

    if (records.length === 0 && !digitizeResult.data) return;

    if (records.length > 0) {
      // Wide/Flat Format: 1 row per form/farmer
      const schemaObj = schemas.find((s) => s.id === selectedSchema);
      const fieldKeys = schemaObj?.fields?.map((f) => f.key) || Object.keys(digitizeResult.data || {});

      const header = ["Record ID", "Farmer ID / Name", "Submitted At", ...fieldKeys];
      const rows = [header];

      records.forEach((rec) => {
        const row = [
          rec.id,
          rec.farmer_id || "Auto-detected",
          rec.submitted_at || new Date().toISOString(),
          ...fieldKeys.map((k) => rec.data?.[k]?.value || ""),
        ];
        rows.push(row);
      });

      const csvText = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const code = schemaObj?.form_code || "survey";
      downloadCsv(`survey-data-${code}-${Date.now()}.csv`, csvText);
      toast.success(`Downloaded CSV with ${records.length} form record(s)!`);
    } else {
      // Fallback single-record format
      const rows = [["Field Key", "Extracted Value", "Confidence Score (%)", "Detection Source"]];
      Object.entries(digitizeResult.data).forEach(([key, item]) => {
        rows.push([
          key,
          item.value || "",
          String(item.confidence ?? 0),
          item.source || "",
        ]);
      });

      const csvText = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const schemaObj = schemas.find((s) => s.id === selectedSchema);
      const code = schemaObj?.form_code || "form";
      downloadCsv(`digitized-${code}-${Date.now()}.csv`, csvText);
      toast.success("CSV file downloaded successfully!");
    }
  };

  const handleApproveAndSave = async () => {
    if (!digitizeResult || !digitizeResult.data) return;
    setSavingDb(true);
    try {
      const answers: Record<string, string | number> = {};
      Object.entries(digitizeResult.data).forEach(([key, item]) => {
        if (item.value !== null && item.value !== undefined) {
          answers[key] = item.value;
        }
      });

      const selectedFarmerObj = farmers.find((f) => f.id === selectedFarmer);
      const farmerName =
        selectedFarmerObj?.fullName ||
        selectedFarmerObj?.name ||
        String(answers["farmer_name"] || answers["farmer_full_name"] || "Scanned Farmer");

      const schemaObj = schemas.find((s) => s.id === selectedSchema);
      const isJoita =
        (schemaObj?.form_title || "").toLowerCase().includes("joita") ||
        Object.keys(answers).some((k) => k.includes("joita") || k.includes("soil"));

      if (isJoita) {
        await saveJOITAPerforma({
          farmerId: selectedFarmer,
          supervisorId: profile?.uid || "supervisor",
          farmerName,
          status: "submitted",
          village: String(answers["village"] || ""),
          cluster: (answers["cluster"] as any) || "Taragarh",
          district: String(answers["district"] || "Kaithal"),
          mobile: String(answers["mobile"] || answers["contact"] || ""),
        });
      } else {
        await saveRecordLocalFirst({
          id: newLocalId(),
          fullName: farmerName,
          age: answers["age"] ? Number(answers["age"]) : null,
          gender: (answers["gender"] as any) || "",
          contactNumber: String(answers["contact"] || answers["mobile"] || ""),
          village: String(answers["village"] || ""),
          tehsil: String(answers["tehsil"] || ""),
          district: String(answers["district"] || ""),
          state: String(answers["state"] || "Haryana"),
          killahs: answers["killahs"] ? Number(answers["killahs"]) : null,
          isLeadFarmer: false,
          leadFarmerID: null,
          supervisorID: profile?.uid || "supervisor",
          answers,
          photos: [],
          status: "submitted",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }

      toast.success("Record approved and saved to database!");
      setSavedSuccess(true);
    } catch (e) {
      toast.error("Failed to save to database: " + (e as Error).message);
    } finally {
      setSavingDb(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-muted/20">
      <div className="flex items-center justify-between p-4 bg-card border-b">
        <h2 className="text-xl font-bold">
          {lang === "hi" ? "पेपर फॉर्म स्कैन करें" : "Scan Paper Form"}
        </h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="size-6" />
        </Button>
      </div>

      <div className="p-4 space-y-6 overflow-y-auto pb-24">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
            <AlertCircle className="size-6 mb-2 text-red-500" />
            <p className="font-semibold text-sm">Error: {error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-red-200 text-red-700"
              onClick={reset}
            >
              Dismiss
            </Button>
          </div>
        )}

        <Card className="shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-[18px]">Step 1: Upload Photos in Chunks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Form Template (Form ID)</label>
              {loadingSchemas ? (
                <div className="flex items-center text-muted-foreground text-sm">
                  <Loader2 className="size-4 animate-spin mr-2" /> Loading templates...
                </div>
              ) : schemas.length === 0 ? (
                <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg border border-amber-200">
                  No form templates yet. Ask admin to upload a blank form template first.
                </div>
              ) : (
                <select
                  className="w-full h-12 px-3 rounded-xl border border-border bg-card"
                  value={selectedSchema}
                  onChange={(e) => setSelectedSchema(e.target.value)}
                >
                  {schemas.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.form_title || s.form_code || s.id} ({s.fields?.length || 0} fields)
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Select Farmer <span className="text-xs text-muted-foreground font-normal">(Optional — AI will auto-detect from form if blank)</span>
              </label>
              <select
                className="w-full h-12 px-3 rounded-xl border border-border bg-card"
                value={selectedFarmer}
                onChange={(e) => setSelectedFarmer(e.target.value)}
              >
                <option value="">-- Auto-detect from handwritten form --</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.fullName || f.name || "Unnamed Farmer"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Photos (JPEG/PNG)</label>
              <Input
                type="file"
                multiple
                accept="image/jpeg,image/png"
                onChange={handleFileChange}
                className="h-12"
              />
              {photos.length > 0 && (
                <p className="text-sm text-green-600 mt-2 font-medium">
                  {photos.length} photos selected.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl border">
              <div>
                <p className="text-sm font-semibold">Form Batch Processing Mode</p>
                <p className="text-xs text-muted-foreground">
                  {batchMode
                    ? "Batch mode: Each photo is a SEPARATE form (1 survey record per photo)"
                    : "Multi-page mode: Combine all photos into 1 single multi-page form record"}
                </p>
              </div>
              <Button
                variant={batchMode ? "default" : "outline"}
                size="sm"
                onClick={() => setBatchMode(!batchMode)}
              >
                {batchMode ? "Batch (Multiple Forms)" : "Multi-Page (1 Form)"}
              </Button>
            </div>

            <Button
              className="w-full h-12 font-bold"
              onClick={doUpload}
              disabled={
                stage === "uploading" || !selectedSchema || photos.length === 0
              }
            >
              {stage === "uploading" ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" /> Uploading ({progress}%)
                </>
              ) : (
                <>
                  <Upload className="mr-2 size-5" /> Upload Photos Chunk
                </>
              )}
            </Button>

            {uploadResult && (
              <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg border border-green-200 flex items-center">
                <CheckCircle className="size-4 mr-2" />
                {uploadResult.uploaded_count} photos uploaded. Ready to scan & digitize.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm rounded-xl">
          <CardHeader>
            <CardTitle className="text-[18px]">Step 2: Scan & Digitize Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <p className="font-semibold text-lg">
                <span className="text-primary">{pendingCount}</span> photos waiting to be scanned
              </p>
            </div>

            <Button
              className="w-full h-12 font-bold bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={doDigitize}
              disabled={stage === "digitizing" || pendingCount === 0 || !selectedSchema}
            >
              {stage === "digitizing" ? (
                <>
                  <Loader2 className="mr-2 size-5 animate-spin" /> Scanning & Reading ({progress}%)
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 size-5" /> Scan & Read All Forms
                </>
              )}
            </Button>

            {digitizeResult && (
              <div className="mt-4 space-y-4">
                <div
                  className={`p-4 rounded-lg border flex flex-col gap-1 ${
                    digitizeResult.status === "complete"
                      ? "bg-green-50 border-green-200"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {digitizeResult.status === "complete" ? (
                      <CheckCircle className="text-green-600 size-5" />
                    ) : (
                      <AlertCircle className="text-amber-600 size-5" />
                    )}
                    <span
                      className={
                        digitizeResult.status === "complete" ? "text-green-800" : "text-amber-800"
                      }
                    >
                      Status: {digitizeResult.status === "complete" ? "Complete" : "Needs Review"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Record ID: {digitizeResult.record_id}
                  </p>
                </div>

                {/* Download CSV & Approve Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-12 font-bold border-green-600 text-green-700 hover:bg-green-50"
                    onClick={handleDownloadCsv}
                  >
                    <FileSpreadsheet className="mr-2 size-5 text-green-600" />
                    Download CSV
                  </Button>

                  <Button
                    className="h-12 font-bold bg-green-600 text-white hover:bg-green-700"
                    onClick={handleApproveAndSave}
                    disabled={savingDb || savedSuccess}
                  >
                    {savingDb ? (
                      <Loader2 className="mr-2 size-5 animate-spin" />
                    ) : savedSuccess ? (
                      <CheckCircle className="mr-2 size-5" />
                    ) : (
                      <Database className="mr-2 size-5" />
                    )}
                    {savedSuccess ? "Saved in Database" : "Approve & Store in DB"}
                  </Button>
                </div>

                <div className="overflow-x-auto rounded-lg border mt-2">
                  <table className="w-full text-sm text-left whitespace-nowrap">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Field</th>
                        <th className="px-4 py-2 font-semibold">Value</th>
                        <th className="px-4 py-2 font-semibold">Confidence</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y bg-card">
                      {Object.entries(digitizeResult.data).map(([key, item]) => {
                        const lowConf = item.confidence < 60;
                        return (
                          <tr key={key} className={lowConf ? "bg-yellow-50/50" : ""}>
                            <td className="px-4 py-3 font-medium flex items-center gap-2">
                              {lowConf && <AlertCircle className="size-4 text-amber-500" />}
                              {key}
                            </td>
                            <td className="px-4 py-3">
                              {item.value || (
                                <span className="text-muted-foreground italic">empty</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                                  lowConf
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {item.confidence}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
