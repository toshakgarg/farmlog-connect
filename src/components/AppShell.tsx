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
    <div className="min-h-screen bg-gray-50 app-shell flex flex-col w-full overflow-x-hidden" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <header
        className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-gray-100"
        style={{ paddingTop: 'env(safe-area-inset-top, 24px)' }}
      >
        {onRefresh && (refreshing || distance > 0) ? (
          <div className="absolute top-16 left-0 right-0 flex justify-center pull-refresh-indicator bg-white/90 backdrop-blur" style={{ height: `${Math.max(0, distance)}px` }}>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Wifi className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
              <span>{refreshing ? "Refreshing..." : "Pull to refresh"}</span>
            </div>
          </div>
        ) : null}
        <div className="mx-auto flex items-center justify-between px-4 h-16 max-w-5xl">
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
          <div className="flex items-center gap-2 min-w-0 flex-1 px-2">
            <div className="min-w-0">
              <p className="font-bold text-gray-900 text-[15px] leading-tight whitespace-nowrap">FarmLog</p>
              <p className="text-gray-500 text-xs truncate">{subtitle || title}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
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
        </div>
        {actions ? <div className="mx-auto max-w-5xl px-4 pb-3 bg-white">{actions}</div> : null}
      </header>
      <main
        className={`mx-auto max-w-5xl w-full flex-1 px-4 app-main overflow-x-hidden`}
        style={{ paddingTop: actions ? 'calc(env(safe-area-inset-top, 24px) + 112px)' : 'calc(env(safe-area-inset-top, 0px) + 64px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 64px)' }}
      >
        {children}
      </main>
    </div>
  );
}
