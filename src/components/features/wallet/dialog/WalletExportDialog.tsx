"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/shared/Modal";
import GenericSelect from "@/components/shared/GenericSelect";
import { exportToExcel } from "@/lib/exportExcel";
import { getWalletsTransactionsForExport, type TransactionExportScope } from "@/actions/wallet-export.actions";
import type { Wallet } from "@/types/wallet";

function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString("fr-FR");
}

const SCOPE_OPTIONS: { value: TransactionExportScope; label: string; description: string }[] = [
  { value: "month", label: "Dernier mois", description: "Transactions des 30 derniers jours" },
  { value: "year", label: "Dernière année", description: "Transactions des 12 derniers mois" },
  { value: "all", label: "Tout", description: "L'intégralité des transactions" },
];

export default function WalletExportDialog({ wallets }: { wallets: Wallet[] }) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<TransactionExportScope>("month");
  const [target, setTarget] = useState("all");
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const accountId = target === "all" ? undefined : target;
      const data = await getWalletsTransactionsForExport(scope, accountId);

      const scopeLabel = { month: "dernier_mois", year: "derniere_annee", all: "tout" }[scope];
      const filename =
        target === "all"
          ? `transactions_comptes_${scopeLabel}`
          : `transactions_${data[0]?.accountName ?? "compte"}_${scopeLabel}`;

      exportToExcel(
        filename,
        data.map((w) => ({
          name: w.accountName.slice(0, 31),
          headers: ["Label", "Montant (€)", "Solde compte (€)", "Date", "Poche"],
          rows: w.transactions.map((t) => [
            t.label,
            t.amount,
            t.balanceAfter,
            formatDate(t.date),
            t.category.name,
          ]),
        })),
      );
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileDown className="size-4" /> Exporter en Excel
      </Button>

      <Modal
        title="Exporter les transactions"
        open={open}
        confirmLabel={loading ? "Export en cours…" : "Exporter"}
        onClose={() => setOpen(false)}
        onConfirm={handleExport}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Compte
            </p>
            <GenericSelect
              items={[{ id: "all", name: "Tous les comptes" }, ...wallets]}
              value={target}
              onValueChange={setTarget}
              getValue={(w) => w.id}
              getLabel={(w) => w.name}
              placeholder="Choisir un compte"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium" style={{ color: "var(--color-text-muted)" }}>
              Période
            </p>
            {SCOPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScope(opt.value)}
                className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                  scope === opt.value
                    ? "border-zinc-900 bg-zinc-50"
                    : "border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50/50"
                }`}
              >
                <p className="text-sm font-medium text-zinc-900">{opt.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </>
  );
}
