const fs = require("fs");
const content = `
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Home, List, User, Loader2, CheckCircle2, Tractor } from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/farmer")({
  ssr: false,
  component: FarmerPage,
});

function FarmerPage() {
  const { t, lang } = useI18n();
  const { profile, ready, logout } = useAuth();
  const navigate = useNavigate();
  const [record, setRecord] = useState<FarmerRecord | null>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (ready && !profile) navigate({ to: "/" });
    if (ready && profile && profile.role !== "farmer") navigate({ to: \`/\${profile.role}\` });
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
      await pushRecord({ ...record, answers });
      toast.success(t("saved") || "Saved successfully");
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  }

  if (!ready || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" /> {t("loading") || "Loading..."}</div>
    );
  }

  const editable = questions.filter((q) => q.farmerEditable);
  const staticQs = questions.filter((q) => !q.farmerEditable);

  // Calculate profile completion
  const totalFields = 5 + questions.length; // Basic 5 fields + questions
  let filledFields = 0;
  if (record) {
    if (record.fullName) filledFields++;
    if (record.village) filledFields++;
    if (record.district) filledFields++;
    if (record.killahs) filledFields++;
    if (record.contactNumber) filledFields++;
    questions.forEach(q => {
      if (answers[q.id] !== undefined && answers[q.id] !== "") filledFields++;
    });
  }
  const completionPercentage = Math.round((filledFields / totalFields) * 100) || 0;

  return (
    <AppShell title={t("appName") || "FarmLog"} subtitle={\`\${t("farmer") || "Farmer"} · \${profile?.name}\`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="pb-24">
        <TabsContent value="home" className="space-y-4 mt-0">
          {!record ? (
            <Card className="shadow-sm rounded-xl border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">{t("noProfileLinked") || "No farmer profile linked to your account."}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">Welcome, {profile?.name.split(' ')[0]}</h2>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Completion</span>
                  <div className="flex items-center gap-2">
                    <Progress value={completionPercentage} className="h-2 w-16" />
                    <span className="text-xs font-bold text-primary">{completionPercentage}%</span>
                  </div>
                </div>
              </div>
`;
fs.writeFileSync("generate_farmer_1.js", content);
