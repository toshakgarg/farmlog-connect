import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import React from "react";
import { Plus, RefreshCw, Search, Home, List, User, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FarmerForm } from "@/components/FarmerForm";
import { JOITAForm } from "@/components/JOITAForm";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import {
  deleteRecord,
  listQuestions,
  listRecords,
  saveRecordLocalFirst,
  syncPending,
  getJOITAPerformasBySupervisor,
  saveJOITAPerforma,
  deleteJOITAPerforma,
} from "@/lib/data";
import { useI18n } from "@/lib/i18n";

// Supervisor workflow: review assigned farmers, edit records, and create or
// update JOITA performas. Forms own field editing; this route owns selection
// and save/cancel orchestration.
import {
  allLocalRecords,
  newLocalId,
  putLocalRecord,
  deleteLocalRecord,
  type LocalRecord,
} from "@/lib/offline";
import {
  emptyFarmer,
  emptyJOITAPerforma,
  type FarmerRecord,
  type SurveyQuestion,
  type JOITAPerforma,
} from "@/lib/types";
import { useOnline } from "@/hooks/useOnline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LanguageToggle } from "@/components/LanguageToggle";

class JOITAErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: string | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  override render() {
    if (this.state.error) {
      return (
        <div className="p-6 m-4 bg-red-50 border border-red-200 rounded-2xl">
          <h3 className="text-red-700 font-bold text-lg mb-2">Form Error</h3>
          <p className="text-red-600 text-sm">{this.state.error}</p>
          <button
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
            onClick={() => this.setState({ error: null })}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export const ssr = false;

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
  const [joitaRecords, setJoitaRecords] = useState<JOITAPerforma[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [editing, setEditing] = useState<FarmerRecord | null>(null);
  const [editingJoita, setEditingJoita] = useState<JOITAPerforma | null>(null);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [deleteDraft, setDeleteDraft] = useState<string | null>(null);
  const [deleteJoitaId, setDeleteJoitaId] = useState<string | null>(null);

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

    if (navigator.onLine && profile?.uid) {
      try {
        const joita = await getJOITAPerformasBySupervisor(profile.uid);
        joita.sort(
          (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime(),
        );
        setJoitaRecords(joita);
      } catch (err) {
        console.error("JOITA load error:", err);
      }
    }
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

  if (!ready || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading...
      </div>
    );
  }

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

  async function persistJoita(rec: Partial<JOITAPerforma>) {
    if (!navigator.onLine) {
      toast.error("You must be online to save JOITA forms");
      return;
    }
    setSaving(true);
    try {
      await saveJOITAPerforma(rec);
      toast.success(rec.status === "draft" ? "Draft Saved" : "Submitted Successfully");
      setEditingJoita(null);
      await refresh();
    } catch (e) {
      toast.error("Failed to save JOITA form");
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> {t("loading") || "Loading..."}
      </div>
    );
  }

  return (
    <AppShell
      title={t("appName") || "FarmLog"}
      subtitle={`${t("supervisor") || "Supervisor"} · ${profile.name}`}
      onBack={
        editing ? () => setEditing(null) : editingJoita ? () => setEditingJoita(null) : undefined
      }
      onRefresh={refresh}
    >
      <ConfirmDialog
        isOpen={!!deleteDraft}
        title="Delete Draft"
        message="Delete this draft permanently?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={async () => {
          if (deleteDraft) {
            console.log("Deleting draft:", deleteDraft);
            await deleteLocalRecord(deleteDraft);
            try {
              if (navigator.onLine) {
                await deleteRecord(deleteDraft);
              }
            } catch (e) {
              console.error("Failed to delete remote record:", e);
            }
            setRecords((prev) => prev.filter((r) => r.id !== deleteDraft));
            setDeleteDraft(null);
          }
        }}
        onCancel={() => setDeleteDraft(null)}
      />
      <ConfirmDialog
        isOpen={!!deleteJoitaId}
        title="Delete JOITA Form"
        message="Delete this JOITA form permanently?"
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={async () => {
          if (deleteJoitaId) {
            try {
              await deleteJOITAPerforma(deleteJoitaId);
              setJoitaRecords((prev) => prev.filter((r) => r.id !== deleteJoitaId));
              toast.success("Deleted");
            } catch (e) {
              toast.error("Failed to delete");
            }
            setDeleteJoitaId(null);
          }
        }}
        onCancel={() => setDeleteJoitaId(null)}
      />
      {editingJoita !== null ? (
        <JOITAErrorBoundary>
          <JOITAForm
            value={editingJoita}
            farmers={records ?? []}
            onSaveDraft={persistJoita}
            onSubmit={persistJoita}
            onCancel={() => setEditingJoita(null)}
            saving={saving}
          />
        </JOITAErrorBoundary>
      ) : editing ? (
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
                  <p className="mt-2 text-xs font-semibold text-muted-foreground uppercase">
                    {t("myFarmers") || "My Farmers"}
                  </p>
                </CardContent>
                Microsoft.QuickAction.Bluetooth
              </Card>
              <Card className="shadow-sm rounded-xl bg-primary/10 border-primary/20">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <p className="text-3xl font-bold leading-none text-primary">
                    {
                      records.filter((r) => r.updatedAt > Date.now() - 7 * 24 * 60 * 60 * 1000)
                        .length
                    }
                  </p>
                  <p className="mt-2 text-xs font-semibold text-primary uppercase">
                    Records This Week
                  </p>
                </CardContent>
              </Card>
              <Card className="shadow-sm rounded-xl bg-warning/10 border-warning/20 col-span-2">
                <CardContent className="p-4 flex flex-col items-center text-center">
                  <p className="text-3xl font-bold leading-none text-warning-foreground">
                    {pendingCount}
                  </p>
                  <p className="mt-2 text-xs font-semibold text-warning-foreground uppercase">
                    {t("pendingSyncs") || "Pending Sync"}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-center mt-6 mb-8">
              <Button
                className="h-[52px] w-full rounded-xl text-base font-bold shadow-md bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => setEditing({ ...emptyFarmer(profile.uid), id: newLocalId() })}
              >
                <Plus className="mr-2 size-5" /> New Farmer Record
              </Button>
              <Button
                className="h-[52px] w-full rounded-xl text-base font-bold shadow-sm border-2 border-[#15803d] text-[#15803d] bg-transparent hover:bg-primary/5 mt-3"
                onClick={() => setEditingJoita(emptyJOITAPerforma(profile.uid))}
              >
                📋 JOITA प्रपत्र / JOITA Form
              </Button>
            </div>

            <h2 className="text-[20px] font-bold mt-4 mb-2">Recent Farmers</h2>
            {records.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                {t("noRecords") || "No records yet"}
              </p>
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
                      <p className="truncate font-bold text-[16px]">
                        {r.status === "draft" ? r.fullName || "Unnamed Farmer" : r.fullName}
                      </p>
                      <p className="truncate text-[13px] text-muted-foreground mt-0.5">
                        {r.village || "Location not set"} ·{" "}
                        {new Date(r.updatedAt || r.createdAt || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={r.status} pending={r.dirty} />
                      {r.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteDraft(r.id);
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </div>
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
              <Button
                variant="secondary"
                className="h-[52px] w-[52px] rounded-xl shrink-0"
                onClick={doSync}
                disabled={syncing}
              >
                <RefreshCw className={`size-5 ${syncing ? "animate-spin" : ""}`} />
              </Button>
            </div>

            <h3 className="font-bold text-lg mt-6">Farmer Records</h3>
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                {t("noRecords") || "No records found"}
              </p>
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
                        {r.village} · {r.killahs ?? 0} {t("killahs")?.split(" ")[0] || "Acres"} ·{" "}
                        {r.photos.length} 📷
                      </p>
                    </div>
                    <StatusBadge status={r.status} pending={r.dirty} />
                  </button>
                ))}
              </div>
            )}

            <h3 className="font-bold text-lg mt-8 text-[#15803d]">JOITA Forms</h3>
            {(joitaRecords || []).filter((r) =>
              `${r.farmerName || ""} ${r.village || ""} ${r.cluster || ""}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            ).length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No JOITA forms found
              </p>
            ) : (
              <div className="space-y-3">
                {(joitaRecords || [])
                  .filter((r) =>
                    `${r.farmerName || ""} ${r.village || ""} ${r.cluster || ""}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((r) => (
                    <div
                      key={r.id}
                      className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-transform"
                    >
                      <div
                        className="min-w-0 flex-1 cursor-pointer"
                        onClick={() => setEditingJoita(r)}
                      >
                        <p className="truncate font-bold text-[16px] text-[#15803d]">
                          {r.farmerName || "Unnamed"}
                        </p>
                        <p className="truncate text-[13px] text-muted-foreground mt-0.5">
                          {r.village} · {r.cluster} · {new Date(r.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <StatusBadge status={r.status} pending={false} />
                      {r.status === "draft" && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteJoitaId(r.id);
                          }}
                          className="flex items-center justify-center p-2 text-red-500 hover:bg-red-50 rounded-full"
                        >
                          <Trash2 className="size-5" />
                        </button>
                      )}
                    </div>
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
              value="home"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
            >
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
            <TabsTrigger
              value="list"
              className="flex flex-col items-center justify-center flex-1 h-full gap-1 rounded-none border-none bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=inactive]:text-muted-foreground data-[state=active]:shadow-none"
            >
              <List className="size-6" />
              <span className="text-[10px] font-medium leading-none">Records</span>
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
      )}
    </AppShell>
  );
}
