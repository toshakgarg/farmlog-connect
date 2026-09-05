import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search, Home, List, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { FarmerForm } from "@/components/FarmerForm";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { listQuestions, listRecords, saveRecordLocalFirst, syncPending } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { allLocalRecords, newLocalId, putLocalRecord, type LocalRecord } from "@/lib/offline";
import { emptyFarmer, type FarmerRecord, type SurveyQuestion } from "@/lib/types";
import { useOnline } from "@/hooks/useOnline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LanguageToggle } from "@/components/LanguageToggle";

export const Route = createFileRoute("/supervisor")({
  ssr: false,
  component: SupervisorPage,
});

function SupervisorPage() {
  const { t } = useI18n();
  const { profile, ready, logout } = useAuth();
  const navigate = useNavigate();
  const online = useOnline();
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [editing, setEditing] = useState<FarmerRecord | null>(null);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    if (ready && !profile) navigate({ to: "/" });
    if (ready && profile && profile.role !== "supervisor") navigate({ to: `/${profile.role}` });
  }, [ready, profile, navigate]);

  const refresh = useCallback(async () => {
    if (!profile) return;
    const local = await allLocalRecords();
    let merged = local.filter((r) => r.supervisorID === profile.uid);
    if (navigator.onLine) {
      try {
        const remote = await listRecords(profile.uid);
        const byId = new Map<string, LocalRecord>();
        for (const r of remote) byId.set(r.id, { ...r, dirty: false });
        for (const r of merged) if (r.dirty || !byId.has(r.id)) byId.set(r.id, r);
        merged = [...byId.values()];
        for (const r of merged) await putLocalRecord(r);
      } catch {
        /* offline-safe */
      }
    }
    merged.sort((a, b) => b.updatedAt - a.updatedAt);
    setRecords(merged);
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    void refresh();
    void listQuestions().then(setQuestions);
  }, [profile, refresh]);

  const doSync = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await syncPending();
      if (res.synced) toast.success(`${res.synced} ${t("synced")}`);
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [refresh, t]);

  useEffect(() => {
    if (online) void doSync();
    const handler = () => void doSync();
    window.addEventListener("online", handler);
    const interval = window.setInterval(() => {
      if (navigator.onLine) void doSync();
    }, 60000);
    return () => {
      window.removeEventListener("online", handler);
      window.clearInterval(interval);
    };
  }, [online, doSync]);

  const leadFarmers = useMemo(() => records.filter((r) => r.isLeadFarmer), [records]);
  const filtered = useMemo(
    () =>
      records.filter((r) =>
        `${r.fullName} ${r.village} ${r.district}`.toLowerCase().includes(search.toLowerCase()),
      ),
    [records, search],
  );
  const pendingCount = records.filter((r) => r.dirty).length;

  async function persist(rec: FarmerRecord) {
    setSaving(true);
    try {
      const saved = await saveRecordLocalFirst({ ...rec, id: rec.id || newLocalId() });
      toast.success(saved.dirty ? t("queued") || "Queued offline" : t("saved") || "Saved");
      setEditing(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" /> {t("loading") || "Loading..."}</div>
    );
  }

  return (
    <AppShell title={t("appName") || "FarmLog"} subtitle={`${t("supervisor") || "Supervisor"} · ${profile.name}`}>
      {editing ? (
        <FarmerForm
          value={editing}
          questions={questions}
          leadFarmers={leadFarmers.filter((f) => f.id !== editing.id)}
          onSaveDraft={persist}
          onSubmit={persist}
          onCancel={() => setEditing(null)}
          saving={saving}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="pb-24">
          <TabsContent value="home" className="space-y-4 mt-0">
            <div className="grid grid-cols-2 gap-3">
              <Card className="shadow-sm rounded-xl">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <p className="text-3xl font-bold leading-none text-primary">{records.length}</p>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground uppercase">{t("myFarmers") || "My Farmers"}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm rounded-xl bg-warning/10 border-warning/20">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <p className="text-3xl font-bold leading-none text-warning-foreground">{pendingCount}</p>
                  <p className="mt-2 text-xs font-semibold text-warning-foreground uppercase">{t("pendingSyncs") || "Pending Sync"}</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-center mt-6 mb-8">
               <Button
                  className="h-[52px] w-full rounded-xl text-base font-bold shadow-md"
                  onClick={() => setEditing({ ...emptyFarmer(profile.uid), id: newLocalId() })}
                >
                  <Plus className="mr-2 size-5" /> New Record
               </Button>
            </div>

            <h2 className="text-[20px] font-bold mt-4 mb-2">Recent Farmers</h2>
            {records.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("noRecords") || "No records yet"}</p>
            ) : (
              <div className="space-y-3">
                {[...records].slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setEditing(r)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[16px]">{r.fullName || t("draft")}</p>
                      <p className="truncate text-[13px] text-muted-foreground mt-0.5">
                        {r.village} · {r.killahs ?? 0} {t("killahs")?.split(" ")[0] || "Acres"}
                      </p>
                    </div>
                    <StatusBadge status={r.status} pending={r.dirty} />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="list" className="space-y-4 mt-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="h-[52px] rounded-xl pl-10 bg-card border-border shadow-sm"
                  placeholder={t("search") || "Search"}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button variant="secondary" className="h-[52px] w-[52px] rounded-xl shrink-0" onClick={doSync} disabled={syncing}>
                <RefreshCw className={`size-5 ${syncing ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">{t("noRecords") || "No records found"}</p>
            ) : (
              <div className="space-y-3">
                {filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setEditing(r)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-[16px]">{r.fullName || t("draft")}</p>
                      <p className="truncate text-[13px] text-muted-foreground mt-0.5">
                        {r.village} · {r.killahs ?? 0} {t("killahs")?.split(" ")[0] || "Acres"} · {r.photos.length} 📷
                      </p>
                    </div>
                    <StatusBadge status={r.status} pending={r.dirty} />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-4 mt-0">
            <Card className="shadow-sm rounded-xl">
              <CardContent className="p-6 text-center space-y-4">
                <div className="mx-auto flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-2xl">
                  {profile.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{profile.name}</h3>
                  <p className="text-muted-foreground">{profile.email}</p>
                  <p className="text-xs font-semibold uppercase mt-1 text-primary">{profile.role}</p>
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
            <button 
              type="button"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent text-muted-foreground active:text-primary transition-colors"
              onClick={() => setEditing({ ...emptyFarmer(profile.uid), id: newLocalId() })}
            >
              <div className="flex items-center justify-center size-8 rounded-full bg-primary text-primary-foreground shadow-md mb-1">
                <Plus className="size-5" />
              </div>
            </button>
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
      )}
    </AppShell>
  );
}
