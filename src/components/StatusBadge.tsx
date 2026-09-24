import { useI18n } from "@/lib/i18n";
import type { RecordStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, pending }: { status: RecordStatus; pending?: boolean }) {
  const { t } = useI18n();
  const label = pending ? t("pending") : t(status);
  return (
    <span
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-full text-[12px] font-semibold",
        pending
          ? "bg-amber-100 text-amber-700"
          : status === "synced"
            ? "bg-green-100 text-green-700"
            : status === "submitted"
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-600",
      )}
    >
      {label}
    </span>
  );
}
