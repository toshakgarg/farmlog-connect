import React, { useState, useEffect } from "react";
import { Copy, FileImage, Loader2, Plus, Upload, XCircle, CheckCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { useFormSetup } from "../hooks/useFormSetup";
import { listSchemas, FormSchema } from "../api/formIntelligence";
import { useAuth } from "../lib/auth";

export function FormTemplateSetup() {
  const { profile } = useAuth();
  const { stage, progress, result, error, run, reset } = useFormSetup();
  
  const [file, setFile] = useState<File | null>(null);
  const [formCode, setFormCode] = useState("");
  const [schemas, setSchemas] = useState<FormSchema[]>([]);
  const [loadingSchemas, setLoadingSchemas] = useState(false);
  const [formCodeError, setFormCodeError] = useState("");

  const loadExisting = async () => {
    setLoadingSchemas(true);
    try {
      const data = await listSchemas();
      setSchemas(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSchemas(false);
    }
  };

  useEffect(() => {
    loadExisting();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.size > 10 * 1024 * 1024) {
      alert("File must be under 10 MB");
      return;
    }
    if (!["image/jpeg", "image/png"].includes(selected.type)) {
      alert("Only JPEG or PNG allowed");
      return;
    }
    setFile(selected);
  };

  const validateCode = (code: string) => {
    if (!code) return true;
    const isValid = /^[A-Za-z0-9-_]+$/.test(code);
    if (!isValid) {
      setFormCodeError("Only letters, digits, dash, and underscore are allowed.");
    } else {
      setFormCodeError("");
    }
    return isValid;
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormCode(val);
    validateCode(val);
  };

  const handleScan = async () => {
    if (!file) return;
    if (!validateCode(formCode)) return;
    await run(file, profile?.uid || "admin", formCode || undefined);
    loadExisting();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl">Create Form Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {stage === "idle" && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Upload Blank Form Image (JPEG/PNG)</label>
                <div className="flex items-center gap-4">
                  <Input 
                    type="file" 
                    accept="image/jpeg,image/png" 
                    onChange={handleFileChange} 
                    className="h-12"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Form Code (Optional)</label>
                <Input 
                  type="text" 
                  value={formCode} 
                  onChange={handleCodeChange} 
                  placeholder="e.g. JOITA-v1" 
                  className="h-12"
                />
                {formCodeError && <p className="text-red-500 text-sm mt-1">{formCodeError}</p>}
              </div>

              <Button 
                onClick={handleScan} 
                disabled={!file || !!formCodeError} 
                className="w-full h-12 font-bold"
              >
                <Upload className="mr-2 h-5 w-5" />
                Scan & Create Template
              </Button>
            </>
          )}

          {(stage === "reading" || stage === "building" || stage === "saving") && (
            <div className="space-y-4 py-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
              <p className="font-semibold text-lg">
                {stage === "reading" ? "Reading form structure..." : stage === "building" ? "Building AI schema..." : "Saving template..."}
              </p>
              <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300" 
                  style={{ width: `${progress}%` }} 
                />
              </div>
              <p className="text-sm text-muted-foreground">{progress}%</p>
            </div>
          )}

          {stage === "error" && (
            <div className="bg-red-50 text-red-700 p-6 rounded-xl text-center space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-red-500" />
              <p className="font-bold text-lg">Setup Failed</p>
              <p className="text-sm">{error || "Form service is not running"}</p>
              <Button onClick={reset} variant="outline" className="border-red-200 text-red-700 hover:bg-red-100">
                Try Again
              </Button>
            </div>
          )}

          {stage === "done" && result && (
            <div className="bg-green-50 text-green-900 p-6 rounded-xl space-y-4">
              <div className="flex items-center gap-3 text-green-700">
                <CheckCircle className="h-8 w-8" />
                <h3 className="font-bold text-lg">Template Created Successfully!</h3>
              </div>
              
              <div className="bg-white/60 p-4 rounded-lg space-y-2">
                <p><strong>Title:</strong> {result.form_title}</p>
                <p><strong>Fields:</strong> {result.field_count}</p>
                <p><strong>Sections:</strong> {result.sections.join(", ")}</p>
                
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-green-200/50">
                  <strong className="whitespace-nowrap">Schema ID:</strong>
                  <code className="bg-white px-2 py-1 rounded text-sm flex-1 truncate">{result.schema_id}</code>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    onClick={() => copyToClipboard(result.schema_id)}
                    className="h-8 w-8 shrink-0 hover:bg-green-200"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={() => { reset(); setFile(null); setFormCode(""); }} className="w-full bg-green-600 hover:bg-green-700 text-white">
                Create Another Template
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm rounded-xl">
        <CardHeader>
          <CardTitle className="text-xl">Existing Templates</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSchemas ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : schemas.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No templates found.</p>
          ) : (
            <div className="space-y-3">
              {schemas.map(s => (
                <div key={s.id} className="p-4 border border-border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card">
                  <div>
                    <h4 className="font-bold">{s.form_title || "Untitled Form"}</h4>
                    <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                      <span>Code: {s.form_code || "N/A"}</span>
                      <span>Fields: {s.fields?.length || 0}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <code className="text-xs bg-muted px-2 py-1 rounded w-24 truncate" title={s.id}>{s.id.substring(0, 8)}...</code>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => copyToClipboard(s.id)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
