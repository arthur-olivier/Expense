// InformationDialog.tsx
// dialog de confirmation (AlertDialog) valider/annuler, bouton confirmer désactivable via confirmDisabled

"use client";

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  hideCancel?: boolean;
};

export default function InformationDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  cancelLabel = "Fermer",
  confirmLabel = "Confirmer",
  confirmDisabled = false,
  onConfirm,
  onCancel,
  hideCancel = false,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>

        {children && <div className="text-sm text-muted-foreground">{children}</div>}

        <AlertDialogFooter>
          {!hideCancel && (
            <AlertDialogCancel
              onClick={() => {
                onCancel?.();
                onOpenChange(false);
              }}
            >
              {cancelLabel}
            </AlertDialogCancel>
          )}
          {onConfirm && (
            <AlertDialogAction onClick={onConfirm} disabled={confirmDisabled}>
              {confirmLabel}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
