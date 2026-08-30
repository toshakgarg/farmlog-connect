import { useNavigate } from "@tanstack/react-router";
import { LogOut, Sprout, Wifi, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useOnline } from "@/hooks/useOnline";

export function AppShell({
  title,
  subtitle,
  children,
  actions,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { t } = useI18n();
  const { logout } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sprout className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-bold leading-tight">{title}</h1>
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          <span
            className={`hidden items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold sm:inline-flex ${
              online ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
            }`}
          >
            {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5" />}
            {online ? t("online") : t("offline")}
          </span>
          <LanguageToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("logout")}
            onClick={async () => {
              await logout();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="size-5" />
          </Button>
        </div>
        {actions ? <div className="mx-auto max-w-5xl px-4 pb-3">{actions}</div> : null}
      </header>
      <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>
    </div>
  );
}
