import { useEffect, useState } from "react";
import {
  MapPin,
  Trash2,
  Camera,
  Navigation,
  ArrowRight,
  ArrowLeft,
  Check,
  Save,
  Eye,
  X,
} from "lucide-react";
import { toast } from "sonner";
import DualPhotoInput from './DualPhotoInput';
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

// Controlled farmer-record editor. Dynamic survey fields are rendered by
// QuestionFields while this component handles record metadata and photos.

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
  const [step, setStep] = useState(value.photos.length > 0 ? 5 : 1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);
  const totalSteps = 6;

  useEffect(() => {
    setRec(value);
    setStep(value.photos.length > 0 ? 5 : 1);
  }, [value]);

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
  }, [rec.photos]);

  // Auto-save locally on every change - silent, no parent callback
  useEffect(() => {
    localStorage.setItem("farmlog_current_draft", JSON.stringify(rec));
  }, [rec]);

  // Step 5: Field Photos
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleFarmerPhotoSelected = async (file: File) => {
    setUploadingPhoto(true);
    try {
      let latitude: number | null = null;
      let longitude: number | null = null;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true, timeout: 8000
          })
        );
        latitude = pos.coords.latitude;
        longitude = pos.coords.longitude;
      } catch { /* GPS unavailable */ }

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      let url = base64;
      try {
        const { uploadPhoto } = await import('../lib/storage');
        url = await uploadPhoto(base64, `farmer_${Date.now()}.jpg`, rec.id ?? `new_${Date.now()}`);
      } catch { /* use base64 */ }

      const photo: PhotoMeta = { url, latitude, longitude, timestamp: Date.now() };
      setRec((r) => ({ ...r, photos: [...r.photos, photo] }));
      toast.success(photo.latitude ? t("gpsCaptured") : t("gpsUnavailable"));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!rec.fullName || rec.fullName.trim().length < 2 || /[^a-zA-Z\s]/.test(rec.fullName)) {
      newErrors["fullName"] = "Please enter a valid full name";
    }

    if (!rec.contactNumber || !/^\d{10}$/.test(rec.contactNumber)) {
      newErrors["contactNumber"] = "Please enter a valid 10-digit mobile number";
    }

    if (rec.age === undefined || rec.age === null || rec.age < 18 || rec.age > 100) {
      newErrors["age"] = "Age must be between 18 and 100";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (
      rec.killahs === null ||
      rec.killahs === undefined ||
      rec.killahs <= 0 ||
      rec.killahs > 9999
    ) {
      newErrors["killahs"] = "Please enter a valid land size";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const set = <K extends keyof FarmerRecord>(k: K, v: FarmerRecord[K]) => {
    setRec((r) => ({ ...r, [k]: v }));
    // Clear error when typing
    if (errors[k as string]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[k as string];
        return next;
      });
    }
  };

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
    if (
      !rec.fullName.trim() ||
      !rec.village.trim() ||
      rec.killahs === null ||
      rec.killahs === undefined
    ) {
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
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
          );
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
      { enableHighAccuracy: true },
    );
  }

  const text = (
    key: keyof FarmerRecord,
    label: string,
    opts?: { type?: string; required?: boolean; maxLength?: number; pattern?: string },
  ) => {
    const error = errors[key as string];
    return (
      <div className="space-y-1.5">
        <Label htmlFor={String(key)} className="text-[14px] font-semibold">
          {label} {opts?.required ? <span className="text-destructive">*</span> : null}
        </Label>
        <Input
          id={String(key)}
          className={`h-[52px] rounded-lg ${error ? "border-red-500" : "border-border"}`}
          type={opts?.type ?? "text"}
          inputMode={opts?.type === "number" ? "numeric" : opts?.type === "tel" ? "tel" : "text"}
          maxLength={opts?.maxLength}
          pattern={opts?.pattern}
          value={rec[key] === null || rec[key] === undefined ? "" : String(rec[key])}
          onChange={(e) =>
            set(
              key,
              (opts?.type === "number"
                ? e.target.value === ""
                  ? null
                  : Number(e.target.value)
                : e.target.value) as FarmerRecord[typeof key],
            )
          }
        />
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>
    );
  };

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
            {text("contactNumber", t("contactNumber") || "Contact Number", {
              type: "tel",
              maxLength: 10,
              pattern: "[0-9]{10}",
            })}
          </div>
        );
      case 2:
        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            <Button
              type="button"
              variant="outline"
              className="w-full h-[52px] rounded-lg border-primary/30 text-primary font-bold shadow-sm"
              onClick={getLocation}
            >
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
            {text("killahs", t("killahs") || "Land Size (Killahs/Acres)", {
              type: "number",
              required: true,
            })}
            <div className="flex items-center justify-between rounded-xl border border-border p-4 shadow-sm bg-card">
              <div>
                <Label className="text-[15px] font-bold">{t("leadFarmer") || "Lead Farmer"}</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("isThisLeadFarmer") || "Is this a lead farmer?"}
                </p>
              </div>
              <Switch
                checked={rec.isLeadFarmer}
                onCheckedChange={(v) => set("isLeadFarmer", v)}
                className="scale-110"
              />
            </div>
            {!rec.isLeadFarmer ? (
              <div className="space-y-1.5">
                <Label className="text-[14px] font-semibold">
                  {t("linkedLead") || "Linked Lead Farmer"}
                </Label>
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
            <p className="text-sm text-muted-foreground mb-4">
              Please answer the following survey questions.
            </p>
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
            <div className="space-y-4">
              <DualPhotoInput
                onFileSelected={handleFarmerPhotoSelected}
                uploading={uploadingPhoto}
                label="खेत की फोटो / Field Photo"
                sublabel="Minimum 1 photo required — GPS auto-stamped"
              />

              {/* Photo count indicator */}
              <p className="text-center text-sm text-gray-500">
                {rec.photos?.length ?? 0} photo(s) added
                {(rec.photos?.length ?? 0) === 0 && (
                  <span className="text-red-500 ml-1">* Required</span>
                )}
              </p>

              {/* Photo grid */}
              {(rec.photos ?? []).length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {(rec.photos ?? []).map((photo, idx) => (
                    <div key={photo.localKey ?? photo.url ?? idx} className="relative rounded-xl overflow-hidden aspect-[4/3]">
                      <img
                        src={photo.url || previews[photo.localKey ?? ""] || ""}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setViewPhoto(photo.url || previews[photo.localKey ?? ""] || null)}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      {/* GPS overlay */}
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1 pointer-events-none">
                        {photo.latitude ? (
                          <p className="text-white text-[10px]">
                            📍 {photo.latitude.toFixed(4)}, {photo.longitude?.toFixed(4)}
                          </p>
                        ) : (
                          <p className="text-gray-300 text-[10px]">📍 GPS not available</p>
                        )}
                        <p className="text-gray-300 text-[10px]">
                          {new Date(photo.timestamp).toLocaleTimeString('en-IN')}
                        </p>
                      </div>
                      {/* Delete button */}
                      <button
                        onClick={() => removePhoto(idx)}
                        className="absolute top-2 right-2 w-7 h-7 bg-red-600 rounded-full flex items-center justify-center shadow-lg z-10"
                      >
                        <span className="text-white text-xs font-bold">✕</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {viewPhoto ? (
              <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/90 p-4">
                <button
                  type="button"
                  onClick={() => setViewPhoto(null)}
                  aria-label="Close photo"
                  className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white"
                >
                  <X className="size-6" />
                </button>
                <img
                  src={viewPhoto}
                  alt="Field photo"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : null}
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
              <p className="text-sm text-success-foreground/80 mt-1">
                Please review the details before submitting.
              </p>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-3 text-sm">
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span className="font-semibold">{rec.fullName || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Village:</span>{" "}
                  <span className="font-semibold">{rec.village || "-"}</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Land:</span>{" "}
                  <span className="font-semibold">{rec.killahs ?? "-"} Killahs</span>
                </div>
                <div className="flex justify-between border-b border-border pb-2">
                  <span className="text-muted-foreground">Photos:</span>{" "}
                  <span className="font-semibold">{rec.photos.length} captured</span>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 pb-20">
      <div className="sticky top-14 z-20 bg-background/95 backdrop-blur pt-2 pb-4 -mx-4 px-4 border-b border-border">
        <div className="flex items-center justify-between text-sm font-bold text-foreground mb-3">
          <span>
            Step {step} of {totalSteps}
          </span>
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

      <div 
        className="fixed bottom-0 left-0 right-0 z-30 bg-card/95 backdrop-blur-md border-t border-border p-4 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.1)]"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="max-w-5xl mx-auto flex gap-3">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              className="h-[52px] w-[60px] shrink-0 rounded-xl"
              onClick={() => setStep(step - 1)}
            >
              <ArrowLeft className="size-5" />
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              className="h-[52px] w-[80px] shrink-0 rounded-xl text-muted-foreground"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}

          {step < totalSteps ? (
            <Button
              type="button"
              className="h-[52px] flex-1 rounded-xl font-bold text-[16px] shadow-md"
              onClick={() => {
                if (step === 1 && !validateStep1()) return;
                if (step === 3 && !validateStep3()) return;
                setStep(step + 1);
              }}
            >
              Next <ArrowRight className="ml-2 size-5" />
            </Button>
          ) : (
            <Button
              type="button"
              className="h-[52px] flex-1 rounded-xl font-bold text-[16px] shadow-md"
              disabled={saving}
              onClick={() => {
                if (validate()) onSubmit({ ...rec, status: "submitted" });
              }}
            >
              <Check className="mr-2 size-5" /> Submit Record
            </Button>
          )}
        </div>

        <div className="max-w-5xl mx-auto mt-3">
          <Button
            type="button"
            variant="ghost"
            className="w-full h-[48px] rounded-xl text-muted-foreground font-semibold hover:bg-muted/50"
            disabled={saving}
            onClick={() => onSaveDraft({ ...rec, status: "draft" })}
          >
            <Save className="mr-2 size-4" /> Save as Draft for later
          </Button>
        </div>
      </div>
    </div>
  );
}
