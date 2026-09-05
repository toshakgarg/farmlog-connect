import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, MapPin, Plus, Trash2, X, Home, Users, List, Settings, CheckCircle2, Loader2, Shield, Tractor } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import {
  deleteAppUser,
  deleteQuestion,
  deleteRecord,
  downloadCsv,
  listQuestions,
  listRecords,
  listUsers,
  recordsToCsv,
  saveAppUser,
  saveQuestion,
} from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { newLocalId } from "@/lib/offline";
import type { AppUser, FarmerRecord, QuestionType, SurveyQuestion } from "@/lib/types";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Admin Panel — FarmLog Survey Management" },
      {
        name: "description",
        content:
          "Manage supervisors, farmers, survey questions and export all agricultural field data.",
      },
      { property: "og:title", content: "Admin Panel — FarmLog Survey Management" },
      {
        property: "og:description",
        content: "Manage accounts, dynamic survey questions and export farmer records as CSV.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { t, lang } = useI18n();
  const { profile, ready, createAccount } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<FarmerRecord[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [supervisors, setSupervisors] = useState<AppUser[]>([]);
  const [farmerUsers, setFarmerUsers] = useState<AppUser[]>([]);
  const [detail, setDetail] = useState<FarmerRecord | null>(null);
  const [filters, setFilters] = useState({
    village: "",
    supervisor: "",
    min: "",
    max: "",
    from: "",
    to: "",
  });

  useEffect(() => {
    if (ready && !profile) navigate({ to: "/" });
    if (ready && profile && profile.role !== "admin") navigate({ to: `/${profile.role}` });
  }, [ready, profile, navigate]);

  const refresh = useCallback(async () => {
    try {
      const [recs, qs, sup, far] = await Promise.all([
        listRecords(),
        listQuestions(),
        listUsers("supervisor"),
        listUsers("farmer"),
      ]);
      setRecords(recs);
      setQuestions(qs);
      setSupervisors(sup);
      setFarmerUsers(far);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => {
    if (profile?.role === "admin") void refresh();
  }, [profile, refresh]);

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (filters.village && !r.village?.toLowerCase().includes(filters.village.toLowerCase()))
          return false;
        if (filters.supervisor && r.supervisorID !== filters.supervisor) return false;
        if (filters.min && (r.killahs ?? 0) < Number(filters.min)) return false;
        if (filters.max && (r.killahs ?? 0) > Number(filters.max)) return false;
        if (filters.from && r.createdAt < new Date(filters.from).getTime()) return false;
        if (filters.to && r.createdAt > new Date(filters.to).getTime() + 86400000) return false;
        return true;
      }),
    [records, filters],
  );

  if (!ready || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" /> {t("loading") || "Loading..."}</div>
    );
  }

  const supervisorName = (uid?: string | null) => {
    if (!uid) return "Unknown";
    return supervisors.find((s) => s.uid === uid)?.name ?? uid.slice(0, 6);
  };

  return (
    <AppShell title={t("appName")} subtitle={`${t("admin")} · ${profile.name}`}>
      {detail ? (
        <RecordDetail
          record={detail}
          questions={questions}
          supervisorName={supervisorName(detail.supervisorID)}
          onClose={() => setDetail(null)}
        />
      ) : (
        <Tabs defaultValue="dashboard" className="pb-24">
          <TabsContent value="dashboard" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card className="shadow-sm rounded-xl">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{farmerUsers.length}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1">Total Farmers</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm rounded-xl">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{supervisors.length}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1">Total Supervisors</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm rounded-xl">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                    <List className="size-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{records.length}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1">Total Records</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm rounded-xl">
                <CardContent className="flex items-center gap-3 p-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
                    <Refresh className="size-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold leading-none">{records.filter((r) => r.status !== "synced").length}</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1">Pending Sync</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <h2 className="text-[20px] font-bold mt-8 mb-2">Recent Activity</h2>
            {records.length === 0 ? (
              <Card className="shadow-sm rounded-xl border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                    <List className="size-8" />
                  </div>
                  <h3 className="text-[16px] font-medium text-foreground">No records yet</h3>
                  <p className="text-[14px] text-muted-foreground mt-1">Supervisors will add farmers here</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow-sm rounded-xl">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {[...records]
                      .sort((a, b) => b.updatedAt - a.updatedAt)
                      .slice(0, 5)
                      .map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => setDetail(r)}
                          className="flex w-full items-center justify-between gap-3 p-4 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[16px] font-medium">{r.fullName}</p>
                            <p className="truncate text-[14px] text-muted-foreground mt-0.5">
                              {r.village} · {supervisorName(r.supervisorID)} · {new Date(r.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <StatusBadge status={r.status} />
                        </button>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="records" className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("filters")}</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <Input
                  placeholder={t("village")}
                  value={filters.village}
                  onChange={(e) => setFilters({ ...filters, village: e.target.value })}
                />
                <select
                  className="h-9 rounded-lg border border-input bg-card px-2 text-sm"
                  value={filters.supervisor}
                  onChange={(e) => setFilters({ ...filters, supervisor: e.target.value })}
                >
                  <option value="">
                    {t("all")} — {t("supervisor")}
                  </option>
                  {supervisors.map((s) => (
                    <option key={s.uid} value={s.uid}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  placeholder={t("minLand")}
                  value={filters.min}
                  onChange={(e) => setFilters({ ...filters, min: e.target.value })}
                />
                <Input
                  type="number"
                  placeholder={t("maxLand")}
                  value={filters.max}
                  onChange={(e) => setFilters({ ...filters, max: e.target.value })}
                />
                <Input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                />
                <Input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                />
              </CardContent>
            </Card>
            <Button
              variant="secondary"
              className="w-full touch-row"
              onClick={() =>
                downloadCsv(`farmlog-${Date.now()}.csv`, recordsToCsv(filtered, questions))
              }
            >
              <Download className="mr-2 size-4" /> {t("exportCsv")}
            </Button>
            <div className="space-y-2">
              {filtered.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setDetail(r)}
                  >
                    <p className="truncate font-semibold">{r.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.village} · {r.killahs ?? 0} · {supervisorName(r.supervisorID)} ·{" "}
                      {new Date(r.createdAt).toLocaleDateString()}
                    </p>
                  </button>
                  <StatusBadge status={r.status} />
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("delete")}
                    onClick={async () => {
                      await deleteRecord(r.id);
                      toast.success(t("delete"));
                      void refresh();
                    }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">{t("noRecords")}</p>
              ) : null}
            </div>
          </TabsContent>

          <TabsContent value="questions">
            <QuestionsManager questions={questions} onChanged={refresh} lang={lang} />
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-0">
            <UsersManager
              supervisors={supervisors}
              farmerUsers={farmerUsers}
              records={records}
              onCreate={createAccount}
              onChanged={refresh}
            />
          </TabsContent>

          <TabsList className="fixed bottom-0 left-0 right-0 z-50 flex h-[64px] rounded-none border-t border-border bg-card p-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] justify-around pb-safe bg-card text-muted-foreground">
            <TabsTrigger value="dashboard" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
              <Home className="size-6" />
              <span className="text-[10px] font-medium leading-none">Home</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
              <Users className="size-6" />
              <span className="text-[10px] font-medium leading-none">Users</span>
            </TabsTrigger>
            <TabsTrigger value="records" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
              <List className="size-6" />
              <span className="text-[10px] font-medium leading-none">List</span>
            </TabsTrigger>
            <TabsTrigger value="questions" className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none">
              <Settings className="size-6" />
              <span className="text-[10px] font-medium leading-none">Settings</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-4">
        <p className="text-3xl font-bold leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function RecordDetail({
  record,
  questions,
  supervisorName,
  onClose,
}: {
  record: FarmerRecord;
  questions: SurveyQuestion[];
  supervisorName: string;
  onClose: () => void;
}) {
  const { t, lang } = useI18n();
  return (
    <div className="space-y-4">
      <Button variant="ghost" onClick={onClose}>
        <X className="mr-2 size-4" /> {t("back")}
      </Button>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{record.fullName}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          {[
            [t("age"), record.age],
            [t("gender"), record.gender],
            [t("contactNumber"), record.contactNumber],
            [t("village"), record.village],
            [t("tehsil"), record.tehsil],
            [t("district"), record.district],
            [t("state"), record.state],
            [t("killahs"), record.killahs],
            [t("isLeadFarmer"), record.isLeadFarmer ? t("yes") : t("no")],
            [t("linkedLead"), record.leadFarmerID ?? "-"],
            [t("assignedSupervisor"), supervisorName],
            [t("status"), t(record.status)],
          ].map(([l, v]) => (
            <div key={String(l)}>
              <p className="text-[11px] text-muted-foreground">{l}</p>
              <p className="font-medium">{v === null || v === "" ? "-" : String(v)}</p>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("surveyAnswers")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {questions.map((q) => (
            <div
              key={q.id}
              className="flex justify-between gap-3 border-b border-border pb-2 last:border-0"
            >
              <span className="text-muted-foreground">{lang === "hi" ? q.labelHi : q.labelEn}</span>
              <span className="font-medium">{String(record.answers?.[q.id] ?? "-")}</span>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("photos")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {record.photos.map((p, i) => (
            <div key={i} className="overflow-hidden rounded-lg border border-border">
              <img
                src={p.url}
                alt={`${record.fullName} ${i + 1}`}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
              <p className="flex items-center gap-1 p-2 text-[10px] text-muted-foreground">
                <MapPin className="size-3" />
                {p.latitude ? `${p.latitude.toFixed(5)}, ${p.longitude?.toFixed(5)}` : "-"} ·{" "}
                {new Date(p.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
          {record.photos.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRecords")}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function QuestionsManager({
  questions,
  onChanged,
  lang,
}: {
  questions: SurveyQuestion[];
  onChanged: () => void;
  lang: string;
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState({
    labelEn: "",
    labelHi: "",
    type: "text" as QuestionType,
    options: "",
    required: false,
    farmerEditable: false,
  });

  async function add() {
    if (!draft.labelEn && !draft.labelHi) return;
    const q: SurveyQuestion = {
      id: newLocalId(),
      labelEn: draft.labelEn,
      labelHi: draft.labelHi,
      type: draft.type,
      options:
        draft.type === "category"
          ? draft.options
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      required: draft.required,
      farmerEditable: draft.farmerEditable,
      order: questions.length,
    };
    await saveQuestion(q);
    setDraft({
      labelEn: "",
      labelHi: "",
      type: "text",
      options: "",
      required: false,
      farmerEditable: false,
    });
    toast.success(t("saved"));
    onChanged();
  }

  async function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const a = questions[index];
    const b = questions[target];
    if (!a || !b) return;
    await Promise.all([
      saveQuestion({ ...a, order: target }),
      saveQuestion({ ...b, order: index }),
    ]);

    onChanged();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t("add")} — {t("question")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("labelEn")}</Label>
              <Input
                value={draft.labelEn}
                onChange={(e) => setDraft({ ...draft, labelEn: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("labelHi")}</Label>
              <Input
                value={draft.labelHi}
                onChange={(e) => setDraft({ ...draft, labelHi: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("answerType")}</Label>
            <div className="flex gap-2">
              {(["category", "numeric", "text"] as QuestionType[]).map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setDraft({ ...draft, type: tp })}
                  className={`flex-1 rounded-lg border px-2 py-2 text-xs ${
                    draft.type === tp
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card"
                  }`}
                >
                  {tp === "category"
                    ? t("category")
                    : tp === "numeric"
                      ? t("numeric")
                      : t("shortText")}
                </button>
              ))}
            </div>
          </div>
          {draft.type === "category" ? (
            <div className="space-y-1.5">
              <Label>{t("options")}</Label>
              <Input
                value={draft.options}
                onChange={(e) => setDraft({ ...draft, options: e.target.value })}
              />
            </div>
          ) : null}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={draft.required}
                onCheckedChange={(v) => setDraft({ ...draft, required: v })}
              />
              {t("required")}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={draft.farmerEditable}
                onCheckedChange={(v) => setDraft({ ...draft, farmerEditable: v })}
              />
              {t("farmerEditable")}
            </label>
          </div>
          <Button className="w-full touch-row" onClick={add}>
            <Plus className="mr-2 size-4" /> {t("add")}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className="flex items-center gap-2 rounded-xl border border-border bg-card p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {lang === "hi" ? q.labelHi || q.labelEn : q.labelEn || q.labelHi}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {q.type === "category" ? (q.options ?? []).join(", ") : q.type} ·{" "}
                {q.required ? t("required") : t("optional")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("moveUp")}
              onClick={() => move(i, -1)}
            >
              <ArrowUp className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("moveDown")}
              onClick={() => move(i, 1)}
            >
              <ArrowDown className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("delete")}
              onClick={async () => {
                await deleteQuestion(q.id);
                onChanged();
              }}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsersManager({
  supervisors,
  farmerUsers,
  records,
  onCreate,
  onChanged,
}: {
  supervisors: AppUser[];
  farmerUsers: AppUser[];
  records: FarmerRecord[];
  onCreate: ReturnType<typeof useAuth>["createAccount"];
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [role, setRole] = useState<"supervisor" | "farmer">("supervisor");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    farmerRecordId: "",
  });
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function submit() {
    setSubmitted(true);
    if (!form.name || !form.email || !form.password) {
      toast.error(t("requiredFieldsMissing") || "Please fill in all required fields");
      return;
    }
    
    setBusy(true);
    try {
      await onCreate({
        email: form.email.trim(),
        password: form.password,
        name: form.name,
        role,
        phone: form.phone,
        farmerRecordId: role === "farmer" ? form.farmerRecordId || null : null,
      });
      setForm({ name: "", email: "", password: "", phone: "", farmerRecordId: "" });
      setSubmitted(false);
      toast.success(`${role === "supervisor" ? "Supervisor" : "Farmer"} created successfully ✓`);
      onChanged();
    } catch (e) {
      toast.error((e as Error).message.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  }

  const allUsers = [...supervisors, ...farmerUsers].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-6">
      <Card className="shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-4 border-b border-border">
          <CardTitle className="text-[18px] font-bold">Create New User</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setRole("supervisor")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                role === "supervisor"
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Shield className={`size-6 mb-2 ${role === "supervisor" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-semibold text-[14px]">Supervisor</span>
            </button>
            <button
              type="button"
              onClick={() => setRole("farmer")}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${
                role === "farmer"
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/50"
              }`}
            >
              <Tractor className={`size-6 mb-2 ${role === "farmer" ? "text-primary" : "text-muted-foreground"}`} />
              <span className="font-semibold text-[14px]">Farmer</span>
            </button>
          </div>

          <div className="space-y-4">
            <Input
              placeholder="Full Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`h-[52px] rounded-lg ${submitted && !form.name ? "border-destructive ring-1 ring-destructive" : "border-border"}`}
            />
            <Input
              placeholder="Email *"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={`h-[52px] rounded-lg ${submitted && !form.email ? "border-destructive ring-1 ring-destructive" : "border-border"}`}
            />
            <Input
              placeholder="Password *"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className={`h-[52px] rounded-lg ${submitted && !form.password ? "border-destructive ring-1 ring-destructive" : "border-border"}`}
            />
            <Input
              placeholder="Contact Number (Optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="h-[52px] rounded-lg border-border"
            />
            {role === "farmer" ? (
              <select
                className="h-[52px] w-full rounded-lg border border-border bg-card px-3 text-[14px]"
                value={form.farmerRecordId}
                onChange={(e) => setForm({ ...form, farmerRecordId: e.target.value })}
              >
                <option value="">
                  None — Select linked farmer record (Optional)
                </option>
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} — {r.village}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <Button className="w-full h-[52px] rounded-lg text-[16px] font-bold shadow-md active:scale-[0.99] transition-transform" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="mr-2 size-5 animate-spin" /> : <Plus className="mr-2 size-5" />} 
            Create {role === "supervisor" ? "Supervisor" : "Farmer"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-[18px] font-bold mt-8 mb-4">Existing Users</h3>
        {allUsers.map((u) => (
          <Card key={u.uid} className="shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-foreground font-bold text-[16px]">
                {u.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="truncate text-[16px] font-bold">{u.name}</p>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    u.role === "supervisor" ? "bg-primary/15 text-primary" : "bg-blue-500/15 text-blue-600"
                  }`}>
                    {u.role}
                  </span>
                </div>
                <p className="truncate text-[13px] text-muted-foreground">{u.email}</p>
              </div>
              <div className="flex flex-col items-end gap-3 shrink-0">
                <Switch
                  checked={u.active !== false}
                  onCheckedChange={async (v) => {
                    await saveAppUser({ ...u, active: v });
                    onChanged();
                  }}
                  aria-label="Toggle active status"
                  className="scale-90"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-7 hover:bg-destructive/10"
                  aria-label={t("delete")}
                  onClick={async () => {
                    await deleteAppUser(u.uid);
                    onChanged();
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {allUsers.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No users found.</p>
        )}
      </div>
    </div>
  );
}
