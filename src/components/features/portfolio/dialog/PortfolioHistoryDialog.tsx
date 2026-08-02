"use client";

import { Pencil } from "lucide-react";
import Modal from "@/components/shared/Modal";
import ConfirmDeleteDialog from "@/components/shared/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { PortfolioTransactionTypeLabels } from "@/lib/enums";
import { formatEUR } from "@/lib/utils";
import type { PortfolioTransactionRow } from "@/types/portfolio";

type Props = {
  open: boolean;
  portfolioName: string;
  loading: boolean;
  transactions: PortfolioTransactionRow[] | null;
  isPending: boolean;
  onClose: () => void;
  onDelete: (transactionId: string) => void;
};

export default function PortfolioHistoryDialog({
  open,
  portfolioName,
  loading,
  transactions,
  isPending,
  onClose,
  onDelete,
}: Props) {
  return (
    <Modal
      title={`Historique — ${portfolioName}`}
      open={open}
      confirmLabel="Fermer"
      onClose={onClose}
      onConfirm={onClose}
    >
      <div className="max-h-[60vh] space-y-1 overflow-y-auto">
        {loading && (
          <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-caption)" }}>
            Chargement...
          </p>
        )}
        {!loading && transactions?.length === 0 && (
          <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-caption)" }}>
            Aucun mouvement.
          </p>
        )}
        {!loading &&
          transactions?.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50"
            >
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {PortfolioTransactionTypeLabels[t.type] ?? t.type}
                  {t.asset && ` — ${t.asset.name}`}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {t.quantity ? `${t.quantity} × ${formatEUR(t.price ?? 0)} · ` : ""}
                  {new Date(t.date).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <p
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: t.amount >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
                >
                  {t.amount >= 0 ? "+" : ""}
                  {formatEUR(t.amount)}
                </p>
                <ConfirmDeleteDialog
                  title="Supprimer ce mouvement ?"
                  description="La position sera recalculée à partir du reste de l'historique."
                  onConfirm={() => onDelete(t.id)}
                  trigger={
                    <Button variant="ghost" size="icon" className="size-6" disabled={isPending}>
                      <Pencil className="size-3" />
                    </Button>
                  }
                />
              </div>
            </div>
          ))}
      </div>
    </Modal>
  );
}
