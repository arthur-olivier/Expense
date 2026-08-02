"use client";

import Modal from "@/components/shared/Modal";
import { formatEUR } from "@/lib/utils";

type WalletTransaction = {
  id: number;
  label: string;
  amount: number;
  balanceAfter: number;
  date: Date;
  category: { name: string };
};

type Props = {
  open: boolean;
  walletName: string;
  loading: boolean;
  transactions: WalletTransaction[] | null;
  onClose: () => void;
};

export default function WalletHistoryDialog({ open, walletName, loading, transactions, onClose }: Props) {
  return (
    <Modal title={`Historique — ${walletName}`} open={open} confirmLabel="Fermer" onClose={onClose} closeOnly={true}>
      <div className="max-h-[60vh] min-h-[200px] space-y-1 overflow-y-auto">
        {loading && (
          <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-caption)" }}>
            Chargement...
          </p>
        )}
        {!loading && transactions?.length === 0 && (
          <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-caption)" }}>
            Aucune transaction.
          </p>
        )}
        {!loading &&
          transactions?.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {t.label}
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  {t.category.name} · {new Date(t.date).toLocaleDateString("fr-FR")}
                </p>
              </div>
              <div className="text-right">
                <p
                  className="text-sm font-semibold tabular-nums"
                  style={{ color: t.amount >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
                >
                  {t.amount >= 0 ? "+" : ""}
                  {formatEUR(t.amount)}
                </p>
                <p className="text-xs tabular-nums" style={{ color: "var(--color-text-caption)" }}>
                  Solde : {formatEUR(t.balanceAfter)}
                </p>
              </div>
            </div>
          ))}
      </div>
    </Modal>
  );
}

export type { WalletTransaction };
