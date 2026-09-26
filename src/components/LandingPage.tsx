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
    <div className="min-h-screen bg-[#fafaf8] flex flex-col" style={{paddingTop: 'env(safe-area-inset-top, 0px)'}}>
      <div className="flex justify-end px-4 pt-3">
        <LanguageToggle />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 w-full max-w-sm mx-auto">
        <div className="w-20 h-20 bg-green-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
          <Sprout className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-4xl font-black text-gray-900 mb-1">FarmLog</h1>
        <p className="text-xs tracking-widest text-gray-400 uppercase mb-2">FIELD NOTES · INDIA</p>

        <p className="text-gray-500 text-center text-base mb-8">{t('tagline')}</p>

        <div className="w-full space-y-4 mb-8">
          {[
            { icon: MapPin, key: 'feature1' },
            { icon: ClipboardList, key: 'feature2' },
            { icon: RefreshCw, key: 'feature3' },
          ].map(({ icon: Icon, key }) => (
            <div key={key} className="flex items-center gap-4 text-left">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-gray-700 text-base">{t(key as any)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-8" style={{paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)'}}>
        <Button
          onClick={onLoginClick}
          className="h-[56px] w-full rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-md transition-transform active:scale-[0.98]"
        >
          {t('login')}
        </Button>
        <p className="mt-4 text-xs font-medium text-muted-foreground text-center">v1.0</p>
      </div>
    </div>
  );
}
