import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <div className={cn("inline-flex rounded-full border border-border bg-card p-0.5", className)}>
      {(["hi", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {l === "hi" ? "हिंदी" : "EN"}
        </button>
      ))}
    </div>
  );
}
