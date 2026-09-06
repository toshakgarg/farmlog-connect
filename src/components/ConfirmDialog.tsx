import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmVariant,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant: "danger" | "primary";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="rounded-2xl shadow-xl w-[90vw] max-w-md p-6">
        <DialogTitle className="text-[18px] font-bold">{title}</DialogTitle>
        <DialogDescription className="text-[14px] text-muted-foreground mt-2">
          {message}
        </DialogDescription>
        <div className="flex items-center gap-3 mt-6 justify-end">
          <Button variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant === "danger" ? "destructive" : "default"}
            className="flex-1"
            onClick={() => {
              onConfirm();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}