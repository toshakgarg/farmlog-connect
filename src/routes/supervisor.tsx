import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { FarmerForm } from "@/components/FarmerForm";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { listQuestions, listRecords, saveRecordLocalFirst, syncPending } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { allLocalRecords, newLocalId, putLocalRecord, type LocalRecord } from "@/lib/offline";
import { emptyFarmer, type FarmerRecord, type SurveyQuestion } from "@/lib/types";
import { useOnline } from "@/hooks/useOnline";

export const Route = createFileRoute("/supervisor")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Supervisor — FarmLog Field Collection" },
      { name: "description", content: "Collect farmer records offline with GPS-stamped photos and dynamic survey questions." },
      { property: "og:title", content: "Supervisor — FarmLog Field Collection" },
      { property: "og:description", content: "Offline-first farmer data collection for field supervisors." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SupervisorPage,
});

function SupervisorPage() {
  const { t } = useI18n();
  const { profile, ready } = useAuth();
  const navigate = useNavigate();
  const online = useOnline();
  const [records, setRecords] = useState<LocalRecord[]>([]);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [editing, setEditing] = useState<FarmerRecord | null>(null);
  const [search, setSearch] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

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
      toast.success(saved.dirty ? t("queued") : t("saved"));
      setEditing(null);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  if (!ready || !profile) {
    return <div className="flex min-h-screen items-center justify-center text-sm">{t("loading")}</div>;
  }

  return (
    <AppShell title={t("appName")} subtitle={`${t("supervisor")} · ${profile.name}`}>
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
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <Stat label={t("myFarmers")} value={records.length} />
            <Stat label={t("totalKillahs")} value={records.reduce((s, r) => s + (r.killahs ?? 0), 0)} />
            <Stat label={t("pendingSyncs")} value={pendingCount} />
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="touch-row pl-9"
                placeholder={t("search")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="secondary" className="touch-row" onClick={doSync} disabled={syncing}>
              <RefreshCw className={`size-4 ${syncing ? "animate-spin" : ""}`} />
              <span className="ml-2 hidden sm:inline">{syncing ? t("syncing") : t("syncNow")}</span>
            </Button>
          </div>

          <Button
            className="w-full touch-row text-base"
            onClick={() => setEditing({ ...emptyFarmer(profile.uid), id: newLocalId() })}
          >
            <Plus className="mr-2 size-5" /> {t("newFarmer")}
          </Button>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">{t("noRecords")}</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setEditing(r)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left shadow-[var(--shadow-card)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{r.fullName || t("draft")}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {r.village} · {r.killahs ?? 0} {t("killahs").split(" ")[0]} ·{" "}
                      {r.isLeadFarmer ? t("leadFarmer") : t("subFarmer")} · {r.photos.length} 📷
                    </p>
                  </div>
                  <StatusBadge status={r.status} pending={r.dirty} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="p-3">
        <p className="text-2xl font-bold leading-none">{value}</p>
        <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
