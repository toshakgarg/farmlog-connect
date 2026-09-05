import { useEffect, useState } from "react";
import { MapPin, Trash2, Camera, Navigation, ArrowRight, ArrowLeft, Check, Save } from "lucide-react";
import { toast } from "sonner";
import { CameraCapture } from "@/components/CameraCapture";
import { QuestionFields } from "@/components/QuestionFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n";
import { deletePhotoBlob, getPhotoBlob } from "@/lib/offline";
import type { FarmerRecord, PhotoMeta, SurveyQuestion } from "@/lib/types";

interface Props {
  value: FarmerRecord;
  questions: SurveyQuestion[];
  leadFarmers: FarmerRecord[];
  onSaveDraft: (rec: FarmerRecord) => void;
  onSubmit: (rec: FarmerRecord) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function FarmerForm({
  value,
  questions,
  leadFarmers,
  onSaveDraft,
  onSubmit,
  onCancel,
  saving,
}: Props) {
  const { t } = useI18n();
  const [rec, setRec] = useState<FarmerRecord>(value);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);
  const totalSteps = 6;

  useEffect(() => setRec(value), [value]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const p of rec.photos) {
        if (p.localKey && !p.url) {
          const blob = await getPhotoBlob(p.localKey);
          if (blob) next[p.localKey] = URL.createObjectURL(blob);
        }
      }
      if (!cancelled) setPreviews((prev) => ({ ...next, ...prev }));
    })();
    return () => {
      cancelled = true;
    };
  }, [rec.photos.length]);

  const set = <K extends keyof FarmerRecord>(k: K, v: FarmerRecord[K]) =>
    setRec((r) => ({ ...r, [k]: v }));

  function addPhoto(photo: PhotoMeta, previewUrl: string) {
    setPreviews((p) => ({ ...p, [photo.localKey!]: previewUrl }));
    setRec((r) => ({ ...r, photos: [...r.photos, photo] }));
    toast.success(photo.latitude ? t("gpsCaptured") : t("gpsUnavailable"));
  }

  async function removePhoto(idx: number) {
    const p = rec.photos[idx];
    if (p?.localKey) await deletePhotoBlob(p.localKey);
    setRec((r) => ({ ...r, photos: r.photos.filter((_, i) => i !== idx) }));
  }

  function validate(): boolean {
    if (!rec.fullName.trim() || !rec.village.trim() || rec.killahs === null || rec.killahs === undefined) {
      toast.error(t("requiredFieldsMissing") || "Please fill in all required fields.");
      return false;
    }
    if (rec.photos.length < 1) {
      toast.error(t("photoRequired") || "At least one photo is required.");
      return false;
    }
    for (const q of questions.filter((x) => x.required)) {
      const a = rec.answers[q.id];
      if (a === undefined || a === "") {
        toast.error(t("requiredFieldsMissing") || "Please fill in all required survey answers.");
        return false;
      }
    }
    return true;
  }

  function getLocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    toast.info("Fetching location...");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // Simple reverse geocode using nominatim for demo (or just leave coordinates)
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          if (data && data.address) {
            if (data.address.village || data.address.town || data.address.city) {
              set("village", data.address.village || data.address.town || data.address.city || "");
            }
            if (data.address.county || data.address.state_district) {
              set("district", data.address.county || data.address.state_district || "");
            }
            if (data.address.state) {
              set("state", data.address.state);
            }
            toast.success("Location filled from GPS");
          } else {
            toast.success(`GPS coordinates captured: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
          }
        } catch (e) {
          toast.error("Could not fetch address details, but GPS works.");
        }
      },
      () => toast.error("Unable to retrieve your location"),
      { enableHighAccuracy: true }
    );
  }

  const text = (key: keyof FarmerRecord, label: string, opts?: { type?: string; required?: boolean }) => (
    <div className="space-y-1.5">
      <Label htmlFor={String(key)} className="text-[14px] font-semibold">
        {label} {opts?.required ? <span className="text-destructive">*</span> : null}
      </Label>
      <Input
        id={String(key)}
        className="h-[52px] rounded-lg border-border"
        type={opts?.type ?? "text"}
        inputMode={opts?.type === "number" ? "numeric" : opts?.type === "tel" ? "tel" : "text"}
        value={rec[key] === null || rec[key] === undefined ? "" : String(rec[key])}
        onChange={(e) =>
          set(key, (opts?.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value) as FarmerRecord[typeof key])
        }
      />
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {text("fullName", t("fullName") || "Full Name", { required: true })}
            {text("age", t("age") || "Age", { type: "number" })}
            <div className="space-y-1.5">
              <Label className="text-[14px] font-semibold">{t("gender") || "Gender"}</Label>
              <div className="flex gap-2">
                {(["male", "female", "other"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => set("gender", g)}
                    className={`flex-1 rounded-lg border-2 px-3 py-3 font-semibold transition-colors ${
                      rec.gender === g
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                    }`}
                  >
                    {t(g) || g.charAt(0).toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {text("contactNumber", t("contactNumber") || "Contact Number", { type: "tel" })}
          </div>
        );
      case 2:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <Button type="button" variant="outline" className="w-full h-[52px] rounded-lg border-primary/30 text-primary font-bold shadow-sm" onClick={getLocation}>
              <Navigation className="mr-2 size-5" /> Auto-fill from GPS
            </Button>
            {text("village", t("village") || "Village / Location", { required: true })}
            {text("tehsil", "Tehsil / Sub-district")}
            {text("district", "District")}
            {text("state", "State")}
          </div>
        );
      case 3:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {text("killahs", t("killahs") || "Land Size (Killahs/Acres)", { type: "number", required: true })}
            <div className="flex items-center justify-between rounded-xl border border-border p-4 shadow-sm bg-card">
              <div>
                <Label className="text-[15px] font-bold">{t("leadFarmer") || "Lead Farmer"}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">{t("isThisLeadFarmer") || "Is this a lead farmer?"}</p>
              </div>
              <Switch checked={rec.isLeadFarmer} onCheckedChange={(v) => set("isLeadFarmer", v)} className="scale-110" />
            </div>
            {!rec.isLeadFarmer ? (
              <div className="space-y-1.5">
                <Label className="text-[14px] font-semibold">{t("linkedLead") || "Linked Lead Farmer"}</Label>
                <select
                  className="h-[52px] w-full rounded-lg border border-border bg-card px-3 text-[14px]"
                  value={rec.leadFarmerID ?? ""}
                  onChange={(e) => set("leadFarmerID", e.target.value || null)}
                >
                  <option value="">{t("none") || "None"}</option>
                  {leadFarmers.map((lf) => (
                    <option key={lf.id} value={lf.id}>
                      {lf.fullName} — {lf.village}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
        );
      case 4:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <p className="text-sm text-muted-foreground mb-4">Please answer the following survey questions.</p>
            <QuestionFields
              questions={questions}
              answers={rec.answers}
              onChange={(id, v) => setRec((r) => ({ ...r, answers: { ...r.answers, [id]: v } }))}
            />
          </div>
        );
      case 5:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center">
              <CameraCapture onCaptured={addPhoto} />
              <p className="mt-4 text-[14px] font-medium text-primary">Tap to capture field photo</p>
              <p className="mt-1 text-xs text-muted-foreground">Photos will be GPS-stamped automatically.</p>
            </div>
            
            {rec.photos.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 mt-4">
                {rec.photos.map((p, i) => (
                  <div key={p.localKey ?? p.url ?? i} className="overflow-hidden rounded-xl border border-border shadow-sm group relative">
                    <img
                      src={p.url || previews[p.localKey ?? ""] || ""}
                      alt={`${t("photos")} ${i + 1}`}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 backdrop-blur-sm flex justify-between items-center">
                      <span className="flex items-center gap-1 text-[10px] text-white truncate max-w-[80%]">
                        <MapPin className="size-3 shrink-0" />
                        {p.latitude ? `${p.latitude.toFixed(3)}, ${p.longitude?.toFixed(3)}` : "No GPS"}
                      </span>
                      <button type="button" onClick={() => removePhoto(i)} aria-label={t("delete")} className="bg-destructive/90 rounded-full p-1.5 active:scale-95 transition-transform">
                        <Trash2 className="size-3.5 text-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 6:
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="rounded-xl bg-success/10 border border-success/20 p-5 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-success/20 text-success mx-auto mb-3">
                <Check className="size-7" />
              </div>
              <h3 className="text-[18px] font-bold text-success-foreground">Review & Submit</h3>
              <p className="text-sm text-success-foreground/80 mt-1">Please review the details before submitting.</p>
            </div>
            
            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-3 text-sm">
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Name:</span> <span className="font-semibold">{rec.fullName || "-"}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Village:</span> <span className="font-semibold">{rec.village || "-"}</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Land:</span> <span className="font-semibold">{rec.killahs ?? "-"} Killahs</span></div>
                <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">Photos:</span> <span className="font-semibold">{rec.photos.length} captured</span></div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 pb-20">
      <div className="sticky top-14 z-20 bg-background/95 backdrop-blur pt-2 pb-4 -mx-4 px-4 border-b border-border">
        <div className="flex items-center justify-between text-sm font-bold text-foreground mb-3">
          <span>Step {step} of {totalSteps}</span>
          <span className="text-primary">{Math.round((step / totalSteps) * 100)}%</span>
        </div>
        <Progress value={(step / totalSteps) * 100} className="h-2.5 rounded-full" />
      </div>

      <div className="flex-1">
        <h2 className="text-[22px] font-extrabold mb-6 text-foreground">
          {step === 1 && "Basic Info"}
          {step === 2 && "Location Details"}
          {step === 3 && "Land Details"}
          {step === 4 && "Survey Questions"}
          {step === 5 && "Field Photos"}
          {step === 6 && "Ready to Submit"}
        </h2>
        {renderStepContent()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)] pb-safe">
        <div className="max-w-5xl mx-auto flex gap-3">
          {step > 1 ? (
            <Button type="button" variant="outline" className="h-[52px] w-[60px] shrink-0 rounded-xl" onClick={() => setStep(step - 1)}>
              <ArrowLeft className="size-5" />
            </Button>
          ) : (
            <Button type="button" variant="ghost" className="h-[52px] w-[80px] shrink-0 rounded-xl text-muted-foreground" onClick={onCancel}>
              Cancel
            </Button>
          )}

          {step < totalSteps ? (
            <Button type="button" className="h-[52px] flex-1 rounded-xl font-bold text-[16px] shadow-md" onClick={() => setStep(step + 1)}>
              Next <ArrowRight className="ml-2 size-5" />
            </Button>
          ) : (
            <Button type="button" className="h-[52px] flex-1 rounded-xl font-bold text-[16px] shadow-md" disabled={saving} onClick={() => { if (validate()) onSubmit({ ...rec, status: "submitted" }); }}>
              <Check className="mr-2 size-5" /> Submit Record
            </Button>
          )}
        </div>
        
        <div className="max-w-5xl mx-auto mt-3">
          <Button type="button" variant="ghost" className="w-full h-[48px] rounded-xl text-muted-foreground font-semibold hover:bg-muted/50" disabled={saving} onClick={() => onSaveDraft({ ...rec, status: "draft" })}>
            <Save className="mr-2 size-4" /> Save as Draft for later
          </Button>
        </div>
      </div>
    </div>
  );
}
