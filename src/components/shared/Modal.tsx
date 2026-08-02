// Modal.tsx
// modale générique (Dialog shadcn) titre/contenu/boutons Annuler-Confirmer, gère un loading pendant onConfirm

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Props = {
  title: string;
  open: boolean;
  confirmLabel?: string;
  className?: string;
  closeOnly?: boolean;
  onClose: () => void;
  onConfirm?: () => Promise<void> | void;
  children: React.ReactNode;
};

export default function Modal({
  title,
  open,
  confirmLabel = "Confirmer",
  className,
  closeOnly = false,
  onClose,
  onConfirm,
  children,
}: Props) {
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!onConfirm) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className={cn(
          "w-full min-w-0 max-w-full md:w-fit md:min-w-[500px] md:max-w-[90vw]",
          className,
        )}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div>{children}</div>

        <DialogFooter className="flex-row gap-2">
          {closeOnly ? (
            <Button
              type="button"
              className="h-12 flex-1 text-[15px] md:h-11 md:text-sm"
              onClick={onClose}
              disabled={loading}
            >
              {confirmLabel}
            </Button>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className="h-12 flex-1 text-[15px] md:h-11 md:text-sm"
                onClick={onClose}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button
                type="button"
                className="h-12 flex-1 text-[15px] md:h-11 md:text-sm"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? "Chargement..." : confirmLabel}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
