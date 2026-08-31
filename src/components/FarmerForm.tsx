import { useEffect, useState } from "react";
import { MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { CameraCapture } from "@/components/CameraCapture";
import { QuestionFields } from "@/components/QuestionFields";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (
      !rec.fullName.trim() ||
      !rec.village.trim() ||
      rec.killahs === null ||
      rec.killahs === undefined
    ) {
      toast.error(t("requiredFieldsMissing"));
      return false;
    }
    if (rec.photos.length < 1) {
      toast.error(t("photoRequired"));
      return false;
    }
    for (const q of questions.filter((x) => x.required)) {
      const a = rec.answers[q.id];
      if (a === undefined || a === "") {
        toast.error(t("requiredFieldsMissing"));
        return false;
      }
    }
    return true;
  }

  const text = (
    key: keyof FarmerRecord,
    label: string,
    opts?: { type?: string; required?: boolean },
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={String(key)} className="text-sm">
        {label} {opts?.required ? <span className="text-destructive">*</span> : null}
      </Label>
      <Input
        id={String(key)}
        className="touch-row"
        type={opts?.type ?? "text"}
        inputMode={opts?.type === "number" ? "numeric" : opts?.type === "tel" ? "tel" : "text"}
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
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("farmer")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {text("fullName", t("fullName"), { required: true })}
          {text("age", t("age"), { type: "number" })}
          <div className="space-y-1.5">
            <Label className="text-sm">{t("gender")}</Label>
            <div className="flex gap-2">
              {(["male", "female", "other"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set("gender", g)}
                  className={`flex-1 rounded-lg border px-3 py-2.5 text-sm ${
                    rec.gender === g
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {t(g)}
                </button>
              ))}
            </div>
          </div>
          {text("contactNumber", t("contactNumber"), { type: "tel" })}
          {text("village", t("village"), { required: true })}
          {text("tehsil", t("tehsil"))}
          {text("district", t("district"))}
          {text("state", t("state"))}
          {text("killahs", t("killahs"), { type: "number", required: true })}
          <div className="flex items-center justify-between rounded-lg border border-border p-3 sm:col-span-2">
            <Label htmlFor="lead" className="text-sm">
              {t("isLeadFarmer")}
            </Label>
            <Switch
              id="lead"
              checked={rec.isLeadFarmer}
              onCheckedChange={(v) =>
                setRec((r) => ({ ...r, isLeadFarmer: v, leadFarmerID: v ? null : r.leadFarmerID }))
              }
            />
          </div>
          {!rec.isLeadFarmer ? (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-sm">{t("linkedLead")}</Label>
              <select
                className="h-12 w-full rounded-lg border border-input bg-card px-3 text-sm"
                value={rec.leadFarmerID ?? ""}
                onChange={(e) => set("leadFarmerID", e.target.value || null)}
              >
                <option value="">{t("none")}</option>
                {leadFarmers.map((lf) => (
                  <option key={lf.id} value={lf.id}>
                    {lf.fullName} — {lf.village}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("surveyAnswers")}</CardTitle>
        </CardHeader>
        <CardContent>
          <QuestionFields
            questions={questions}
            answers={rec.answers}
            onChange={(id, v) => setRec((r) => ({ ...r, answers: { ...r.answers, [id]: v } }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("photos")} <span className="text-destructive">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CameraCapture onCaptured={addPhoto} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {rec.photos.map((p, i) => (
              <div
                key={p.localKey ?? p.url ?? i}
                className="overflow-hidden rounded-lg border border-border"
              >
                <img
                  src={p.url || previews[p.localKey ?? ""] || ""}
                  alt={`${t("photos")} ${i + 1}`}
                  className="aspect-square w-full object-cover"
                />
                <div className="flex items-center justify-between gap-1 p-2 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1 truncate">
                    <MapPin className="size-3 shrink-0" />
                    {p.latitude
                      ? `${p.latitude.toFixed(4)}, ${p.longitude?.toFixed(4)}`
                      : t("gpsUnavailable")}
                  </span>
                  <button type="button" onClick={() => removePhoto(i)} aria-label={t("delete")}>
                    <Trash2 className="size-3.5 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-border bg-card/95 p-3 backdrop-blur">
        <Button variant="ghost" className="touch-row" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button
          variant="secondary"
          className="flex-1 touch-row"
          disabled={saving}
          onClick={() => onSaveDraft({ ...rec, status: "draft" })}
        >
          {t("saveDraft")}
        </Button>
        <Button
          className="flex-1 touch-row"
          disabled={saving}
          onClick={() => {
            if (validate()) onSubmit({ ...rec, status: "submitted" });
          }}
        >
          {t("submit")}
        </Button>
      </div>
    </div>
  );
}
