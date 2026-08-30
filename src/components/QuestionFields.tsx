import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import type { SurveyQuestion } from "@/lib/types";

export function QuestionFields({
  questions,
  answers,
  onChange,
  disabled,
}: {
  questions: SurveyQuestion[];
  answers: Record<string, string | number>;
  onChange: (id: string, value: string | number) => void;
  disabled?: boolean;
}) {
  const { lang, t } = useI18n();
  if (questions.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noRecords")}</p>;
  }
  return (
    <div className="space-y-4">
      {questions.map((q) => {
        const label = (lang === "hi" ? q.labelHi : q.labelEn) || q.labelEn || q.labelHi;
        const value = answers[q.id] ?? "";
        return (
          <div key={q.id} className="space-y-1.5">
            <Label htmlFor={`q-${q.id}`} className="text-sm">
              {label} {q.required ? <span className="text-destructive">*</span> : null}
            </Label>
            {q.type === "category" ? (
              <div className="flex flex-wrap gap-2">
                {(q.options ?? []).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(q.id, opt)}
                    className={`rounded-full border px-3.5 py-2 text-sm ${
                      value === opt
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-foreground"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <Input
                id={`q-${q.id}`}
                inputMode={q.type === "numeric" ? "numeric" : "text"}
                type={q.type === "numeric" ? "number" : "text"}
                disabled={disabled}
                value={String(value)}
                onChange={(e) =>
                  onChange(q.id, q.type === "numeric" ? Number(e.target.value) : e.target.value)
                }
                className="touch-row"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
