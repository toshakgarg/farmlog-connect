import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Home, List, User, Loader2 } from "lucide-react";
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
      await pushRecord({ ...record, answers });
      toast.success(t("saved") || "Saved successfully");
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

  return (
    <AppShell title={t("appName") || "FarmLog"} subtitle={`${t("farmer") || "Farmer"} · ${profile?.name}`}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="pb-24">
        <TabsContent value="home" className="space-y-4 mt-0">
          {!record ? (
            <Card className="shadow-sm rounded-xl border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">{t("noProfileLinked") || "No farmer profile linked to your account."}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="shadow-sm rounded-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-[18px] font-bold">{t("myProfile") || "My Profile"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("name") || "Name"}:</span> <span className="font-semibold">{record.fullName}</span></div>
                  <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("village") || "Village"}:</span> <span className="font-semibold">{record.village}</span></div>
                  <div className="flex justify-between border-b border-border pb-2"><span className="text-muted-foreground">{t("killahs")?.split(" ")[0] || "Land Size"}:</span> <span className="font-semibold">{record.killahs ?? 0}</span></div>
                  <div className="flex justify-between pt-1 items-center">
                    <span className="text-muted-foreground">Status:</span>
                    <StatusBadge status={record.status} />
                  </div>
                </CardContent>
              </Card>

              {record.photos.length > 0 ? (
                <Card className="shadow-sm rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t("photos") || "Photos"}</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {record.photos.map((p, i) => (
                      <div key={i} className="overflow-hidden rounded-xl border border-border relative">
                        <img
                          src={p.url}
                          alt={`${t("photos")} ${i + 1}`}
                          className="aspect-square w-full object-cover"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/60 p-2 backdrop-blur-sm">
                          <span className="flex items-center gap-1 text-[10px] text-white truncate">
                            <MapPin className="size-3 shrink-0" />
                            {p.latitude ? `${p.latitude.toFixed(4)}, ${p.longitude?.toFixed(4)}` : "No GPS"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}
            </>
          )}
        </TabsContent>

        <TabsContent value="list" className="space-y-4 mt-0">
          {!record ? (
            <Card className="shadow-sm rounded-xl border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-muted-foreground">No records to display.</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {staticQs.length > 0 ? (
                <Card className="shadow-sm rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t("surveyAnswers") || "Survey Answers"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {staticQs.map((q) => (
                      <div
                        key={q.id}
                        className="flex justify-between gap-3 border-b border-border py-3 last:border-0"
                      >
                        <span className="text-muted-foreground text-sm">
                          {lang === "hi" ? q.labelHi : q.labelEn}
                        </span>
                        <span className="font-semibold text-sm text-right">{String(record.answers?.[q.id] ?? "-")}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ) : null}

              {editable.length > 0 ? (
                <Card className="shadow-sm rounded-xl">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{t("updateAnswers") || "Update Answers"}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <QuestionFields
                      questions={editable}
                      answers={answers}
                      onChange={(id, v) => setAnswers((a) => ({ ...a, [id]: v }))}
                    />
                    <Button className="w-full h-[52px] rounded-xl font-bold shadow-md" onClick={save} disabled={saving}>
                      {t("save") || "Save Updates"}
                    </Button>
                  </CardContent>
                </Card>
              ) : null}
            </>
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

          <Card className="shadow-sm rounded-xl">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Language</span>
                <LanguageToggle />
              </div>
              <Button 
                variant="destructive" 
                className="w-full h-[52px] rounded-xl font-bold"
                onClick={async () => {
                  await logout();
                  navigate({ to: "/" });
                }}
              >
                Log out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsList className="fixed bottom-0 left-0 right-0 z-50 flex h-[64px] rounded-none border-t border-border bg-card p-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] justify-around pb-safe text-muted-foreground">
          <TabsTrigger value="home" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
            <Home className="size-6" />
            <span className="text-[10px] font-medium leading-none">Home</span>
          </TabsTrigger>
          <TabsTrigger value="list" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
            <List className="size-6" />
            <span className="text-[10px] font-medium leading-none">Records</span>
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
            <User className="size-6" />
            <span className="text-[10px] font-medium leading-none">Profile</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </AppShell>
  );
}
