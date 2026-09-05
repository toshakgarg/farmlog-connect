import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  Shield,
  Sprout,
  Tractor,
  Eye,
  EyeOff,
} from "lucide-react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import type { Role } from "@/lib/types";

import { LandingPage } from "@/components/LandingPage";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "FarmLog — Agricultural Field Survey App" },
      {
        name: "description",
        content:
          "FarmLog collects farmer survey data offline in the field with GPS-stamped photos, in Hindi and English.",
      },
      { property: "og:title", content: "FarmLog — Agricultural Field Survey App" },
      {
        property: "og:description",
        content: "Offline-first farmer survey collection with GPS-stamped in-app camera photos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

const roles: { role: Role; icon: typeof Shield; key: string }[] = [
  { role: "admin", icon: Shield, key: "admin" },
  { role: "supervisor", icon: ClipboardList, key: "supervisor" },
  { role: "farmer", icon: Tractor, key: "farmer" },
];

function LoginPage() {
  const { t } = useI18n();
  const { login, profile, ready, configured } = useAuth();
  const navigate = useNavigate();
  const [showLanding, setShowLanding] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (ready && profile) navigate({ to: `/${profile.role}` });
  }, [ready, profile, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setBusy(true);
    setError(null);
    try {
      const p = await login(email.trim(), password, role);
      navigate({ to: `/${p.role}` });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg === "WRONG_ROLE") setError(t("wrongRole"));
      else if (msg === "ACCOUNT_DISABLED") setError("Account disabled, contact admin");
      else setError(msg.replace("Firebase: ", ""));
    } finally {
      setBusy(false);
    }
  }

  if (showLanding && ready && !profile) {
    return <LandingPage onLoginClick={() => setShowLanding(false)} />;
  }

  return (
    <div className="field-surface flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-lift)]">
            <Sprout className="size-8" />
          </div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{t("appName")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("tagline")}</p>
          <LanguageToggle className="mt-4" />
        </div>

        {!configured ? (
          <Card className="mb-4 border-warning/40 bg-warning/10">
            <CardContent className="p-4 text-sm text-warning-foreground">
              {t("configMissing")}
            </CardContent>
          </Card>
        ) : null}

        {!role ? (
          <div className="space-y-3">
            <p className="text-center text-sm font-medium text-muted-foreground">
              {t("selectRole")}
            </p>
            {roles.map(({ role: r, icon: Icon, key }) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left shadow-[var(--shadow-card)] transition-transform active:scale-[0.99]"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <Icon className="size-5" />
                </span>
                <span className="flex-1">
                  <span className="block text-base font-semibold">{t(key)}</span>
                  <span className="block text-xs text-muted-foreground">{t("loginAs")}</span>
                </span>
              </button>
            ))}
          </div>
        ) : (
          <Card className="shadow-[var(--shadow-card)]">
            <CardContent className="space-y-4 p-5">
              <button
                type="button"
                onClick={() => setRole(null)}
                className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
              >
                <ArrowLeft className="size-4" /> {t("back")}
              </button>
              <h2 className="text-lg font-bold">
                {t("loginAs")} — {t(role)}
              </h2>
              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="font-semibold text-[14px]">
                    Email / ईमेल
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    className="h-[52px] rounded-xl border-gray-200 focus:border-green-500"
                    placeholder="Email / ईमेल"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="font-semibold text-[14px]">
                      Password / पासवर्ड
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="h-[52px] rounded-xl border-gray-200 focus:border-green-500 pr-12"
                      placeholder="Password / पासवर्ड"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-0 top-0 flex h-[52px] w-[52px] items-center justify-center text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      className="text-[14px] font-medium text-primary hover:underline"
                      onClick={() =>
                        alert("Please contact your administrator to reset your password.")
                      }
                    >
                      Forgot Password?
                    </button>
                  </div>
                </div>
                {error ? (
                  <p className="text-sm font-medium text-[#dc2626] bg-[#dc2626]/10 p-3 rounded-lg">
                    {error === "Firebase: Error (auth/invalid-credential)."
                      ? "Invalid email or password"
                      : error}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  className="w-full h-[52px] rounded-xl text-base font-bold shadow-md active:scale-[0.99] transition-transform"
                  disabled={busy || !configured}
                >
                  {busy ? <Loader2 className="mr-2 size-5 animate-spin" /> : null}
                  {t("login")}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
