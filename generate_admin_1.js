const fs = require("fs");
const content = `
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Download, MapPin, Plus, Trash2, X, Home, Users, List, Settings, CheckCircle2, Loader2, Shield, Tractor, UserPlus } from "lucide-react";
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
    if (ready && profile && profile.role !== "admin") navigate({ to: \`/\${profile.role}\` });
  }, [ready, profile, navigate]);

  useEffect(() => {
    if (profile?.role === "admin") void refresh();
  }, [profile, refresh]);

  if (!ready || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 size-5 animate-spin" /> Loading...
      </div>
    );
  }

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
    [records, filters]
  );
`;
fs.writeFileSync("generate_admin_1.js", content);
