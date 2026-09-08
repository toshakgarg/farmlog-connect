import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Camera,
  ArrowDown,
  ArrowUp,
  Download,
  MapPin,
  Plus,
  Trash2,
  X,
  Home,
  Users,
  List,
  Settings,
  CheckCircle2,
  Loader2,
  Shield,
  Tractor,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LanguageToggle } from "@/components/LanguageToggle";
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
import type { AppUser, FarmerRecord, QuestionType, Role, SurveyQuestion } from "@/lib/types";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [{ title: "Admin Panel — FarmLog Survey Management" }],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { t, lang } = useI18n();
  const { profile, ready, createAccount, logout } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<FarmerRecord[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [supervisors, setSupervisors] = useState<AppUser[]>([]);
  const [farmerUsers, setFarmerUsers] = useState<AppUser[]>([]);
  const [detail, setDetail] = useState<FarmerRecord | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showSurvey, setShowSurvey] = useState(false);
  const [filters, setFilters] = useState({
    village: "",
    supervisor: "",
    min: "",
    max: "",
    from: "",
    to: "",
  });

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
    if (ready && !profile) navigate({ to: "/" });
    if (ready && profile && profile.role !== "admin") navigate({ to: `/${profile.role}` });
  }, [ready, profile, navigate]);

  useEffect(() => {
    if (profile?.role === "admin") void refresh();
  }, [profile, refresh]);

  const filtered = useMemo(
    () =>
      records.filter((r) => {
        if (filters.village && !r.village?.toLowerCase().includes(filters.village.toLowerCase()))
          return false;
        if (filters.supervisor && r.supervisorID !== filters.supervisor) return false;
        if (filters.from && r.createdAt < new Date(filters.from).getTime()) return false;
        if (filters.to && r.createdAt > new Date(filters.to).getTime() + 86400000) return false;
        return true;
      }),
    [records, filters],
  );

  if (!ready || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading...
      </div>
    );
  }
  const supervisorName = (id: string) =>
    supervisors.find((s) => s.uid === id)?.name ?? "Unknown Supervisor";

  return (
    <AppShell
      title={t("adminPanel") || "Admin Panel"}
      subtitle={profile.name}
      onBack={detail ? () => setDetail(null) : showSurvey ? () => setShowSurvey(false) : undefined}
      onRefresh={refresh}
    >
      {detail ? (
        <RecordDetail
          record={detail}
          questions={questions}
          supervisorName={supervisorName(detail.supervisorID)}
          onClose={() => setDetail(null)}
        />
      ) : showSurvey ? (
        <QuestionManagement
          questions={questions}
          onChanged={refresh}
          onClose={() => setShowSurvey(false)}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="pb-24">
          <TabsContent value="dashboard" className="space-y-6 mt-0">
            <h2 className="text-xl font-bold">Dashboard</h2>
            <Card
              className="shadow-sm rounded-xl border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors"
              onClick={() => setShowSurvey(true)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    <List className="size-6" />
                  </div>
                  <div>
                    <h3 className="font-bold">Survey Questions</h3>
                    <p className="text-xs text-muted-foreground">Manage forms</p>
                  </div>
                </div>
                <Settings className="size-5 text-muted-foreground" />
              </CardContent>
            </Card>
            <div className="grid grid-cols-2 gap-4">
              <Stat
                label="Total Farmers"
                value={farmerUsers.length}
                icon={<Tractor className="size-5 text-primary" />}
              />
              <Stat
                label="Total Supervisors"
                value={supervisors.length}
                icon={<Shield className="size-5 text-primary" />}
              />
              <Stat
                label="Total Records"
                value={records.length}
                icon={<List className="size-5 text-primary" />}
              />
              <Stat
                label="Records This Month"
                value={
                  records.filter((r) => new Date(r.createdAt).getMonth() === new Date().getMonth())
                    .length
                }
                icon={<CheckCircle2 className="size-5 text-primary" />}
              />
            </div>

            <Card className="shadow-sm rounded-xl overflow-hidden">
              <CardHeader className="pb-2 border-b border-border/50 bg-muted/20">
                <CardTitle className="text-[18px] font-bold">Recent Submissions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {records.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">No records yet.</div>
                  )}
                  {records
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
                          <p className="truncate text-[16px] font-bold text-foreground">
                            {r.fullName}
                          </p>
                          <p className="truncate text-[13px] text-muted-foreground mt-0.5">
                            {r.village} · {supervisorName(r.supervisorID)} ·{" "}
                            {new Date(r.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                        <StatusBadge status={r.status} />
                      </button>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4 mt-0">
            <UserManagement
              allUsers={[...supervisors, ...farmerUsers]}
              records={records}
              createAccount={createAccount}
              onChanged={refresh}
            />
          </TabsContent>

          <TabsContent value="records" className="space-y-4 mt-0">
            <h2 className="text-xl font-bold">Farmer Records</h2>
            <Card className="shadow-sm rounded-xl">
              <CardHeader className="pb-2">
                <CardTitle className="text-[16px]">Filters</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Search by Village..."
                  className="h-[52px] rounded-xl"
                  value={filters.village}
                  onChange={(e) => setFilters({ ...filters, village: e.target.value })}
                />
                <select
                  className="h-[52px] rounded-xl border border-border bg-card px-3 text-[14px]"
                  value={filters.supervisor}
                  onChange={(e) => setFilters({ ...filters, supervisor: e.target.value })}
                >
                  <option value="">All Supervisors</option>
                  {supervisors.map((s) => (
                    <option key={s.uid} value={s.uid}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    className="h-[52px] rounded-xl flex-1"
                    value={filters.from}
                    onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  />
                  <Input
                    type="date"
                    className="h-[52px] rounded-xl flex-1"
                    value={filters.to}
                    onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  />
                </div>
              </CardContent>
            </Card>
            <Button
              variant="secondary"
              className="w-full h-[52px] rounded-xl shadow-sm text-base font-bold bg-primary/10 text-primary hover:bg-primary/20"
              onClick={() =>
                downloadCsv(`farmlog-${Date.now()}.csv`, recordsToCsv(filtered, questions))
              }
            >
              <Download className="mr-2 size-5" /> Export All (CSV)
            </Button>

            <div className="space-y-3">
              {filtered.length === 0 && (
                <div className="text-center p-8 text-muted-foreground bg-muted/30 rounded-xl">
                  No records match your filters.
                </div>
              )}
              {filtered.map((r) => (
                <Card key={r.id} className="shadow-sm rounded-xl overflow-hidden">
                  <button
                    type="button"
                    className="flex w-full flex-col p-4 text-left transition-colors hover:bg-muted/30 active:bg-muted/50"
                    onClick={() => setDetail(r)}
                  >
                    <div className="flex justify-between items-start mb-2 w-full">
                      <p className="font-bold text-[18px]">{r.fullName}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="text-[14px] text-muted-foreground flex items-center gap-1.5 mb-1">
                      <MapPin className="size-4" /> {r.village}
                    </p>
                    <p className="text-[13px] text-muted-foreground flex items-center gap-1.5">
                      <Shield className="size-4" /> {supervisorName(r.supervisorID)}
                    </p>
                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/50 text-[12px] font-medium">
                      <span>{r.killahs ?? 0} Killahs</span>
                      <span>•</span>
                      <span>{r.photos.length} Photos</span>
                      <span>•</span>
                      <span>{new Date(r.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </button>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-0">
            <h2 className="text-xl font-bold">Settings</h2>
            <Card className="shadow-sm rounded-xl">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="flex items-center justify-center size-14 rounded-full bg-primary/10 text-primary font-bold text-2xl">
                  {profile.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{profile.name}</h3>
                  <p className="text-muted-foreground">{profile.email}</p>
                  <p className="text-xs font-semibold uppercase mt-1 text-primary">
                    {profile.role}
                  </p>
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
              value="dashboard"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
            >
              <Home className="size-6" />
              <span className="text-[10px] font-medium leading-none">Home</span>
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
            >
              <Users className="size-6" />
              <span className="text-[10px] font-medium leading-none">Users</span>
            </TabsTrigger>
            <TabsTrigger
              value="records"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
            >
              <List className="size-6" />
              <span className="text-[10px] font-medium leading-none">Records</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
            >
              <Settings className="size-6" />
              <span className="text-[10px] font-medium leading-none">Settings</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}
    </AppShell>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm rounded-xl border-border bg-card">
      <CardContent className="p-4 flex flex-col gap-2 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-20">{icon}</div>
        <p className="text-3xl font-extrabold text-foreground">{value}</p>
        <p className="text-[13px] font-semibold text-muted-foreground">{label}</p>
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { lang } = useI18n();
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-8">
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">{record.fullName || "Unnamed Farmer"}</h2>
          <StatusBadge status={record.status} pending={record.dirty} />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground font-medium">
          <span>Added {new Date(record.createdAt || Date.now()).toLocaleDateString()}</span>
          <span>•</span>
          <span>By {supervisorName}</span>
        </div>
      </div>

      <Card className="shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
          <CardTitle className="text-[16px] font-bold">Farmer Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 p-4">
          {[
            ["Age", record.age],
            ["Gender", record.gender],
            ["Contact", record.contactNumber],
            ["Village", record.village],
            ["Tehsil", record.tehsil],
            ["District", record.district],
            ["State", record.state],
            ["Killahs", record.killahs],
            ["Lead Farmer?", record.isLeadFarmer ? "Yes" : "No"],
            ["Linked Lead", record.leadFarmerID],
          ].map(([l, v]) => {
            const val = v === null || v === undefined || v === "" ? null : String(v);
            return (
              <div key={String(l)} className="space-y-1">
                <p className="text-[12px] font-medium text-muted-foreground uppercase">{l}</p>
                {val ? (
                  <p className="font-bold text-[14px]">{val}</p>
                ) : (
                  <p className="text-[14px] text-muted-foreground italic">Not provided</p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
          <CardTitle className="text-[16px] font-bold">Survey Answers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {questions.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground flex flex-col items-center">
              <List className="size-8 opacity-20 mb-2" />
              <p className="text-sm">No survey responses recorded</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {questions.map((q) => {
                const ans = record.answers?.[q.id];
                const hasAns = ans !== null && ans !== undefined && ans !== "";
                return (
                  <div
                    key={q.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4"
                  >
                    <span className="text-[14px] text-muted-foreground font-medium">
                      {lang === "hi" ? q.labelHi : q.labelEn}
                    </span>
                    {hasAns ? (
                      <span className="font-bold text-[15px] text-right break-words max-w-[60%]">
                        {String(ans)}
                      </span>
                    ) : (
                      <span className="text-[14px] text-muted-foreground italic text-right">
                        Not provided
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="bg-muted/30 pb-3 border-b border-border/50">
          <CardTitle className="text-[16px] font-bold">
            Field Photos ({record.photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent
          className={
            record.photos.length === 0 ? "p-0" : "grid grid-cols-2 gap-3 sm:grid-cols-3 p-4"
          }
        >
          {record.photos.length === 0 && (
            <div className="py-8 text-center text-muted-foreground flex flex-col items-center w-full col-span-full">
              <div className="bg-muted rounded-full p-4 mb-3">
                <Camera className="size-8 opacity-40" />
              </div>
              <p className="text-sm font-medium">No field photos captured</p>
            </div>
          )}
          {record.photos.map((p, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-xl border border-border shadow-sm aspect-square bg-muted"
            >
              <img src={p.url} alt="Field" className="size-full object-cover" />
              {p.timestamp && (
                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 backdrop-blur-sm">
                  <p className="text-[10px] text-white font-medium truncate">
                    {new Date(p.timestamp).toLocaleString()}
                  </p>
                  {p.latitude && (
                    <p className="text-[10px] text-white/80 truncate">
                      {p.latitude.toFixed(4)}, {p.longitude?.toFixed(4)}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <Button
        variant="destructive"
        className="w-full h-[52px] rounded-xl font-bold mt-4"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-5 mr-2" /> Delete Record
      </Button>
      <ConfirmDialog
        isOpen={deleteOpen}
        title="Delete Record"
        message="This action cannot be undone. Are you sure?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={async () => {
          await deleteRecord(record.id);
          onClose();
        }}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function UserManagement({
  allUsers,
  records,
  createAccount,
  onChanged,
}: {
  allUsers: AppUser[];
  records: FarmerRecord[];
  createAccount: (input: {
    email: string;
    password: string;
    name: string;
    role: Role;
    phone?: string;
    farmerRecordId?: string | null;
  }) => Promise<AppUser>;
  onChanged: () => void;
}) {
  const [role, setRole] = useState<"supervisor" | "farmer">("supervisor");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    farmerRecordId: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [deleteUser, setDeleteUser] = useState<string | null>(null);
  const { t } = useI18n();

  async function submit() {
    const newErrors: Record<string, string> = {};
    if (!form.name || form.name.trim().length < 2 || /[^a-zA-Z\s]/.test(form.name)) {
      newErrors["name"] = "Please enter a valid full name";
    }
    if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors["email"] = "Please enter a valid email address";
    }
    if (!form.password || form.password.length < 6) {
      newErrors["password"] = "Password must be at least 6 characters";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setBusy(true);
    try {
      await createAccount({ ...form, role });
      toast.success(role === "supervisor" ? "Supervisor created" : "Farmer created");
      setForm({ name: "", email: "", password: "", phone: "", farmerRecordId: "" });
      setErrors({});
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={!!deleteUser}
        title="Delete User"
        message="This action cannot be undone. Are you sure?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={async () => {
          await deleteAppUser(deleteUser!);
          setDeleteUser(null);
          onChanged();
        }}
        onCancel={() => setDeleteUser(null)}
      />
      <h2 className="text-xl font-bold">User Management</h2>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setRole("supervisor")}
          className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
            role === "supervisor"
              ? "border-primary bg-primary/10 shadow-sm"
              : "border-border bg-card hover:bg-muted"
          }`}
        >
          <Shield
            className={`size-8 mb-2 ${role === "supervisor" ? "text-primary" : "text-muted-foreground"}`}
          />
          <span
            className={`font-bold ${role === "supervisor" ? "text-primary" : "text-muted-foreground"}`}
          >
            Supervisor 🛡
          </span>
        </button>
        <button
          onClick={() => setRole("farmer")}
          className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all ${
            role === "farmer"
              ? "border-primary bg-primary/10 shadow-sm"
              : "border-border bg-card hover:bg-muted"
          }`}
        >
          <Tractor
            className={`size-8 mb-2 ${role === "farmer" ? "text-primary" : "text-muted-foreground"}`}
          />
          <span
            className={`font-bold ${role === "farmer" ? "text-primary" : "text-muted-foreground"}`}
          >
            Farmer 🚜
          </span>
        </button>
      </div>

      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-[18px]">
            Create New {role === "supervisor" ? "Supervisor" : "Farmer"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Input
                placeholder="Full Name / पूरा नाम *"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (errors["name"]) setErrors({ ...errors, name: "" });
                }}
                className={`h-[52px] rounded-xl ${errors["name"] ? "border-red-500" : ""}`}
              />
              {errors["name"] && <p className="text-red-500 text-xs mt-1">{errors["name"]}</p>}
            </div>
            <div>
              <Input
                placeholder="Email / ईमेल *"
                type="email"
                value={form.email}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  if (errors["email"]) setErrors({ ...errors, email: "" });
                }}
                className={`h-[52px] rounded-xl ${errors["email"] ? "border-red-500" : ""}`}
              />
              {errors["email"] && <p className="text-red-500 text-xs mt-1">{errors["email"]}</p>}
            </div>
            <div>
              <Input
                placeholder="Password / पासवर्ड *"
                type="password"
                value={form.password}
                onChange={(e) => {
                  setForm({ ...form, password: e.target.value });
                  if (errors["password"]) setErrors({ ...errors, password: "" });
                }}
                className={`h-[52px] rounded-xl ${errors["password"] ? "border-red-500" : ""}`}
              />
              {errors["password"] && (
                <p className="text-red-500 text-xs mt-1">{errors["password"]}</p>
              )}
            </div>
            <Input
              placeholder="Contact / संपर्क (Optional)"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="h-[52px] rounded-xl"
            />
            {role === "farmer" ? (
              <select
                className="h-[52px] w-full rounded-xl border border-border bg-card px-3 text-[14px]"
                value={form.farmerRecordId}
                onChange={(e) => setForm({ ...form, farmerRecordId: e.target.value })}
              >
                <option value="">None — Select linked farmer record (Optional)</option>
                {records.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.fullName} — {r.village}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
          <Button
            className="w-full h-[52px] rounded-xl text-base font-bold"
            onClick={submit}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="mr-2 size-5 animate-spin" />
            ) : (
              <UserPlus className="mr-2 size-5" />
            )}
            Create {role === "supervisor" ? "Supervisor" : "Farmer"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3 pt-4">
        <h3 className="text-[18px] font-bold">Existing Users</h3>
        {allUsers.length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}
        {allUsers.map((u) => (
          <Card key={u.uid} className="shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-[18px]">
                {u.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="truncate text-[16px] font-bold">{u.name}</p>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      u.role === "supervisor"
                        ? "bg-primary/15 text-primary"
                        : "bg-blue-500/15 text-blue-600"
                    }`}
                  >
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
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteUser(u.uid)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function QuestionManagement({
  onClose,

  questions,
  onChanged,
}: {
  questions: SurveyQuestion[];
  onChanged: () => void;
  onClose?: () => void;
}) {
  const [form, setForm] = useState<Partial<SurveyQuestion>>({
    labelEn: "",
    labelHi: "",
    type: "text",
    required: false,
    farmerEditable: true,
    options: [],
  });
  const [busy, setBusy] = useState(false);
  const [tempOptEn, setTempOptEn] = useState("");
  const [tempOptHi, setTempOptHi] = useState("");
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  const move = async (index: number, dir: -1 | 1) => {
    if (index + dir < 0 || index + dir >= questions.length) return;
    const a = questions[index];
    const b = questions[index + dir];
    if (!a || !b) return;
    const t = a.order;
    a.order = b.order;
    b.order = t;
    await saveQuestion(a);
    await saveQuestion(b);
    onChanged();
  };

  const submit = async () => {
    if (!form.labelEn || !form.labelHi) {
      toast.error("Labels are required");
      return;
    }
    setBusy(true);
    try {
      await saveQuestion({
        id: newLocalId(),
        labelEn: form.labelEn,
        labelHi: form.labelHi,
        type: form.type as QuestionType,
        required: form.required ?? false,
        farmerEditable: form.farmerEditable ?? true,
        order: questions.length,
        options: form.options || [],
      });
      toast.success("Question added");
      setForm({
        labelEn: "",
        labelHi: "",
        type: "text",
        required: false,
        farmerEditable: true,
        options: [],
      });
      onChanged();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <ConfirmDialog
        isOpen={!!deleteQuestionId}
        title="Delete Question"
        message="This action cannot be undone. Are you sure?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={async () => {
          await deleteQuestion(deleteQuestionId!);
          setDeleteQuestionId(null);
          onChanged();
        }}
        onCancel={() => setDeleteQuestionId(null)}
      />
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Survey Questions</h2>
        {onClose && (
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      <Card className="shadow-sm rounded-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-[18px]">Add New Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Question Text (English)"
            value={form.labelEn}
            onChange={(e) => setForm({ ...form, labelEn: e.target.value })}
            className="h-[52px] rounded-xl"
          />
          <Input
            placeholder="प्रश्न (Hindi)"
            value={form.labelHi}
            onChange={(e) => setForm({ ...form, labelHi: e.target.value })}
            className="h-[52px] rounded-xl"
          />

          <div className="flex flex-col space-y-4">
            <div className="space-y-1.5 w-full">
              <Label className="text-xs text-muted-foreground">Answer Type</Label>
              <select
                className="h-[52px] w-full rounded-xl border border-border bg-card px-3"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as QuestionType })}
              >
                <option value="text">Text (Short Answer)</option>
                <option value="number">Number</option>
                <option value="category">Category (Dropdown)</option>
              </select>
            </div>

            <label className="flex items-center justify-between w-full h-[52px] px-3 bg-muted/20 border border-border rounded-xl">
              <span className="text-sm font-medium">Required Question</span>
              <Switch
                checked={form.required ?? false}
                onCheckedChange={(v) => setForm({ ...form, required: v })}
              />
            </label>

            <label className="flex items-center justify-between w-full h-[52px] px-3 bg-muted/20 border border-border rounded-xl">
              <span className="text-sm font-medium">Farmer Editable</span>
              <Switch
                checked={form.farmerEditable ?? false}
                onCheckedChange={(v) => setForm({ ...form, farmerEditable: v })}
              />
            </label>
          </div>

          {form.type === "category" && (
            <div className="p-4 bg-muted/30 rounded-xl space-y-4 border border-border/50">
              <Label className="font-bold">Dropdown Options</Label>
              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Option (En)"
                  className="h-[52px] rounded-xl bg-card w-full"
                  value={tempOptEn}
                  onChange={(e) => setTempOptEn(e.target.value)}
                />
                <Input
                  placeholder="विकल्प (Hi)"
                  className="h-[52px] rounded-xl bg-card w-full"
                  value={tempOptHi}
                  onChange={(e) => setTempOptHi(e.target.value)}
                />
                <Button
                  onClick={() => {
                    if (tempOptEn && tempOptHi) {
                      setForm({
                        ...form,
                        options: [...(form.options || []), `${tempOptEn}|${tempOptHi}`],
                      });
                      setTempOptEn("");
                      setTempOptHi("");
                    }
                  }}
                  className="h-[52px] rounded-xl shrink-0 w-full"
                >
                  Add Option
                </Button>
              </div>

              {form.options && form.options.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {form.options.map((opt, i) => {
                    const [en, hi] = opt.split("|");
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 text-sm pl-3 pr-2 py-1.5 bg-background rounded-full border border-border shadow-sm"
                      >
                        <span className="font-medium">
                          {en} <span className="text-muted-foreground font-normal">({hi})</span>
                        </span>
                        <button
                          className="flex items-center justify-center size-5 rounded-full bg-muted hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                          onClick={() => {
                            setForm({
                              ...form,
                              options: form.options?.filter((_, idx) => idx !== i) || [],
                            });
                          }}
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <Button className="w-full h-[52px] rounded-xl font-bold" onClick={submit} disabled={busy}>
            {busy ? (
              <Loader2 className="mr-2 size-5 animate-spin" />
            ) : (
              <Plus className="mr-2 size-5" />
            )}
            Add Question
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3 pt-4">
        {questions
          .sort((a, b) => a.order - b.order)
          .map((q, i) => (
            <Card key={q.id} className="shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-4 flex gap-4">
                <div className="flex flex-col justify-center gap-1">
                  <button
                    className="p-1 hover:bg-muted rounded"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                  >
                    <ArrowUp className="size-4 text-muted-foreground" />
                  </button>
                  <button
                    className="p-1 hover:bg-muted rounded"
                    onClick={() => move(i, 1)}
                    disabled={i === questions.length - 1}
                  >
                    <ArrowDown className="size-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-[16px]">{q.labelEn}</p>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                      {q.type}
                    </span>
                    {q.required && (
                      <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold uppercase">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-[14px] text-muted-foreground">{q.labelHi}</p>
                  {q.type === "category" && q.options && (
                    <p className="text-[12px] text-muted-foreground mt-2 bg-muted/50 p-2 rounded-lg truncate">
                      {q.options.map((o) => o.split("|")[0]).join(", ")}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 self-center text-destructive hover:bg-destructive/10 shrink-0"
                  onClick={() => setDeleteQuestionId(q.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
      </div>
    </div>
  );
}
