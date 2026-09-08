import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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
    if (ready && profile && profile.role !== "farmer") navigate({ to: `/${profile.role}` });
  }, [ready, profile, navigate]);

  const refresh = useCallback(async () => {
    if (!profile?.farmerRecordId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [rec, qs] = await Promise.all([getRecord(profile.farmerRecordId), listQuestions()]);
    setRecord(rec);
    setAnswers(rec?.answers ?? {});
    setQuestions(qs);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> {t("loading") || "Loading..."}
      </div>
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
    questions.forEach((q) => {
      if (answers[q.id] !== undefined && answers[q.id] !== "") filledFields++;
    });
  }
  const completionPercentage = Math.round((filledFields / totalFields) * 100) || 0;

  return (
    <AppShell
      title={t("appName") || "FarmLog"}
      subtitle={`${t("farmer") || "Farmer"} · ${profile?.name}`}
      onRefresh={refresh}
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="pb-24">
        <TabsContent value="home" className="space-y-4 mt-0">
          {!record ? (
            <Card className="shadow-sm rounded-xl border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">
                  {t("noProfileLinked") || "No farmer profile linked to your account."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-2xl font-bold">Welcome, {profile?.name.split(" ")[0]}</h2>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                    Completion
                  </span>
                  <div className="flex items-center gap-2">
                    <Progress value={completionPercentage} className="h-2 w-16" />
                    <span className="text-xs font-bold text-primary">{completionPercentage}%</span>
                  </div>
                </div>
              </div>
              {record.isLeadFarmer && (
                <Card className="bg-primary/10 border-primary/20 shadow-none">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-primary/20 text-primary">
                      <Tractor className="size-4" />
                    </div>
                    <p className="text-sm font-semibold text-primary">You are a Lead Farmer.</p>
                  </CardContent>
                </Card>
              )}

              <Card className="shadow-sm rounded-xl">
                <CardHeader className="pb-2 bg-muted/20 border-b border-border/50">
                  <CardTitle className="text-[16px] font-bold flex items-center gap-2">
                    <MapPin className="size-4 text-muted-foreground" /> Land Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 text-sm">
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold">
                      Village
                    </p>
                    <p className="font-bold text-[15px]">{record.village || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold">
                      District
                    </p>
                    <p className="font-bold text-[15px]">{record.district || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground uppercase font-semibold">
                      Land Size
                    </p>
                    <p className="font-bold text-[15px]">{record.killahs ?? 0} Killahs</p>
                  </div>
                </CardContent>
              </Card>

              {questions.length > 0 && (
                <Card className="shadow-sm rounded-xl">
                  <CardHeader className="pb-2 bg-muted/20 border-b border-border/50">
                    <CardTitle className="text-[16px] font-bold">Survey Answers</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {questions.map((q) => (
                        <div key={q.id} className="flex justify-between items-center p-3 text-sm">
                          <span className="text-muted-foreground">
                            {lang === "hi" ? q.labelHi : q.labelEn}
                          </span>
                          <span className="font-bold">{String(record.answers?.[q.id] ?? "-")}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {record.photos.length > 0 && (
                <Card className="shadow-sm rounded-xl overflow-hidden">
                  <CardHeader className="pb-2 bg-muted/20 border-b border-border/50">
                    <CardTitle className="text-[16px] font-bold">Field Photos</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3 p-4">
                    {record.photos.map((p, i) => (
                      <div
                        key={i}
                        className="relative overflow-hidden rounded-xl border border-border shadow-sm aspect-square bg-muted"
                      >
                        <img
                          src={p.url}
                          alt="Field"
                          className="size-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>
        <TabsContent value="profile" className="space-y-4 mt-0">
          <Card className="shadow-sm rounded-xl">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl">
                {profile?.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold">{profile?.name}</h3>
                <p className="text-muted-foreground">{profile?.email}</p>
                <p className="text-xs font-semibold uppercase mt-1 text-primary">{profile?.role}</p>
              </div>
            </CardContent>
          </Card>

          {record && editable.length > 0 ? (
            <Card className="shadow-sm rounded-xl">
              <CardHeader className="pb-2 bg-muted/20 border-b border-border/50">
                <CardTitle className="text-[16px] font-bold">
                  {t("updateAnswers") || "Update Answers"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-4">
                <QuestionFields
                  questions={editable}
                  answers={answers}
                  onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                />
                <Button
                  className="w-full h-[52px] rounded-xl font-bold shadow-md"
                  onClick={save}
                  disabled={saving}
                >
                  {t("save") || "Save Updates"}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="shadow-sm rounded-xl">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Language</span>
                <LanguageToggle />
              </div>
              <Button
                variant="outline"
                className="w-full h-[52px] rounded-xl font-bold text-destructive border-destructive"
                onClick={async () => {
                  await logout();
                  navigate({ to: "/" });
                }}
              >
                Logout / लॉगआउट
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-4">v1.0</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsList className="fixed bottom-0 left-0 right-0 z-50 flex h-[64px] rounded-none border-t border-border bg-card p-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] justify-around pb-safe text-muted-foreground">
          <TabsTrigger
            value="home"
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
          >
            <Home className="size-6" />
            <span className="text-[10px] font-medium leading-none">Home</span>
          </TabsTrigger>
          <TabsTrigger
            value="profile"
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
          >
            <User className="size-6" />
            <span className="text-[10px] font-medium leading-none">Profile</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </AppShell>
  );
}
