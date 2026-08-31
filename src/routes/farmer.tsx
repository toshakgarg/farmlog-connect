import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { QuestionFields } from "@/components/QuestionFields";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { getRecord, listQuestions, pushRecord } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import type { FarmerRecord, SurveyQuestion } from "@/lib/types";

export const Route = createFileRoute("/farmer")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Profile — FarmLog" },
      {
        name: "description",
        content: "Farmers can view their survey profile and update their optional answers.",
      },
      { property: "og:title", content: "My Profile — FarmLog" },
      {
        property: "og:description",
        content: "View your farm profile and update your survey answers.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FarmerPage,
});

function FarmerPage() {
  const { t, lang } = useI18n();
  const { profile, ready } = useAuth();
  const navigate = useNavigate();
  const [record, setRecord] = useState<FarmerRecord | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && !profile) navigate({ to: "/" });
    if (ready && profile && profile.role !== "farmer") navigate({ to: `/${profile.role}` });
  }, [ready, profile, navigate]);

  useEffect(() => {
    if (!profile?.farmerRecordId) {
      setLoading(false);
      return;
    }
    (async () => {
      const [rec, qs] = await Promise.all([getRecord(profile.farmerRecordId!), listQuestions()]);
      setRecord(rec);
      setAnswers(rec?.answers ?? {});
      setQuestions(qs);
      setLoading(false);
    })();
  }, [profile]);

  async function save() {
    if (!record) return;
    setSaving(true);
    try {
      const updated = { ...record, answers: { ...record.answers, ...answers } };
      await pushRecord(updated);
      setRecord(updated);
      toast.success(t("saved"));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !profile || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm">{t("loading")}</div>
    );
  }

  const editable = questions.filter((q) => q.farmerEditable);
  const readOnly = questions.filter((q) => !q.farmerEditable);

  return (
    <AppShell title={t("appName")} subtitle={`${t("farmer")} · ${profile.name}`}>
      {!record ? (
        <p className="py-10 text-center text-sm text-muted-foreground">{t("noProfileLinked")}</p>
      ) : (
        <div className="space-y-4">
          <Card className="shadow-[var(--shadow-card)]">
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">{t("myProfile")}</CardTitle>
              <StatusBadge status={record.status} />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 text-sm">
              <Field label={t("fullName")} value={record.fullName} />
              <Field label={t("age")} value={record.age} />
              <Field label={t("gender")} value={record.gender ? t(record.gender) : "-"} />
              <Field label={t("contactNumber")} value={record.contactNumber} />
              <Field label={t("village")} value={record.village} />
              <Field label={t("tehsil")} value={record.tehsil} />
              <Field label={t("district")} value={record.district} />
              <Field label={t("state")} value={record.state} />
              <Field label={t("killahs")} value={record.killahs} />
              <Field label={t("isLeadFarmer")} value={record.isLeadFarmer ? t("yes") : t("no")} />
            </CardContent>
          </Card>

          {readOnly.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("surveyAnswers")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {readOnly.map((q) => (
                  <div
                    key={q.id}
                    className="flex justify-between gap-3 border-b border-border pb-2 last:border-0"
                  >
                    <span className="text-muted-foreground">
                      {lang === "hi" ? q.labelHi : q.labelEn}
                    </span>
                    <span className="font-medium">{String(record.answers?.[q.id] ?? "-")}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {editable.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("updateAnswers")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <QuestionFields
                  questions={editable}
                  answers={answers}
                  onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                />
                <Button className="w-full touch-row" onClick={save} disabled={saving}>
                  {t("save")}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {record.photos.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("photos")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {record.photos.map((p, i) => (
                  <div key={i} className="overflow-hidden rounded-lg border border-border">
                    <img
                      src={p.url}
                      alt={`${t("photos")} ${i + 1}`}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                    <p className="flex items-center gap-1 p-2 text-[10px] text-muted-foreground">
                      <MapPin className="size-3" />
                      {p.latitude
                        ? `${p.latitude.toFixed(4)}, ${p.longitude?.toFixed(4)}`
                        : t("gpsUnavailable")}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-medium">{value === null || value === "" ? "-" : String(value)}</p>
    </div>
  );
}
