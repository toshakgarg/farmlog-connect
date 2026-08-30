import { useI18n } from "@/lib/i18n";
import type { RecordStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, pending }: { status: RecordStatus; pending?: boolean }) {
  const { t } = useI18n();
  const label = pending ? t("pending") : t(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
        pending
          ? "bg-warning/20 text-warning-foreground"
          : status === "synced"
            ? "bg-success/15 text-success"
            : status === "submitted"
              ? "bg-primary/12 text-primary"
              : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}
