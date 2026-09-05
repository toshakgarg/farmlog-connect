import { Sprout, MapPin, ClipboardList, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";

interface Props {
  onLoginClick: () => void;
}

export function LandingPage({ onLoginClick }: Props) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-6 py-12 text-center text-foreground">
      <div className="flex w-full justify-end">
        <LanguageToggle />
      </div>

      <div className="mt-8 flex flex-col items-center justify-center flex-1 w-full max-w-sm">
        <div className="flex size-24 items-center justify-center rounded-3xl bg-primary text-primary-foreground shadow-lg">
          <Sprout className="size-12" />
        </div>
        
        <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-foreground">
          FarmLog
        </h1>
        
        <p className="mt-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Field Notes · India
        </p>

        <p className="mt-6 text-lg font-medium text-muted-foreground">
          Khet se record tak<br />
          From field to record
        </p>

        <div className="mt-10 space-y-6 w-full text-left">
          <div className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <MapPin className="size-5" />
            </div>
            <span className="text-base font-medium">Geotagged farm photos</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ClipboardList className="size-5" />
            </div>
            <span className="text-base font-medium">Digital farmer records</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <RefreshCw className="size-5" />
            </div>
            <span className="text-base font-medium">Works offline, syncs automatically</span>
          </div>
        </div>
      </div>

      <div className="mt-auto w-full max-w-sm pt-8">
        <Button
          onClick={onLoginClick}
          className="h-[52px] w-full rounded-lg bg-primary text-lg font-bold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
        >
          Login / लॉगिन करें
        </Button>
        <p className="mt-4 text-xs font-medium text-muted-foreground">
          v1.0
        </p>
      </div>
    </div>
  );
}