import { useNavigate } from "@tanstack/react-router";
import { LogOut, Sprout, Wifi, WifiOff, ArrowLeft } from "lucide-react";
import { useCallback, type ReactNode } from "react";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useOnline } from "@/hooks/useOnline";
import { useBackNavigation, usePullToRefresh } from "@/hooks/use-mobile-gestures";

export function AppShell({
  title,
  subtitle,
  children,
  actions,
  onBack,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  actions?: ReactNode;
  onBack?: (() => void) | undefined;
  onRefresh?: (() => Promise<void> | void) | undefined;
}) {
  const { t } = useI18n();
  const { logout, profile } = useAuth();
  const online = useOnline();
  const navigate = useNavigate();
  const { refreshing, distance } = usePullToRefresh(onRefresh);
  const handleBack = useCallback(() => {
    if (onBack) onBack();
    else navigate({ to: "/" });
  }, [navigate, onBack]);
  useBackNavigation(handleBack);

  return (
    <div className="min-h-screen bg-gray-50 app-shell flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[#e5e7eb] h-[64px]">
        {onRefresh && (refreshing || distance > 0) ? (
          <div className="absolute top-16 left-0 right-0 flex justify-center pull-refresh-indicator bg-white/90 backdrop-blur" style={{ height: `${Math.max(0, distance)}px` }}>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Wifi className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Pull to refresh"}</span>
            </div>
          </div>
        ) : null}
        <div className="mx-auto flex h-full max-w-5xl items-center gap-3 px-4">
          {onBack ? (
            <button
              onClick={onBack}
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="size-5" />
            </button>
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white shadow-sm">
              <Sprout className="size-6" />
            </div>
          )}
          <div className="min-w-0 flex-1 flex flex-col justify-center">
            <h1 className="truncate text-[17px] font-bold leading-tight text-gray-900">FarmLog</h1>
            <p className="truncate text-[11px] text-gray-500 font-medium uppercase tracking-wider">{title}</p>
          </div>
          <LanguageToggle />
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("logout")}
            onClick={async () => {
              await logout();
              navigate({ to: "/" });
            }}
            className="text-gray-500 hover:text-gray-900"
          >
            <LogOut className="size-5" />
          </Button>
        </div>
        {actions ? <div className="absolute top-16 left-0 right-0 mx-auto max-w-5xl px-4 pb-3 bg-white border-b border-[#e5e7eb] shadow-sm">{actions}</div> : null}
      </header>
      <main className={`mx-auto max-w-5xl w-full flex-1 px-4 ${actions ? 'pt-[110px]' : 'pt-[80px]'} pb-24 app-main`}>
        {children}
      </main>
    </div>
  );
}
