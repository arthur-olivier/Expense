"use client";

import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";
import { Landmark, History, Plus, Minus, Trash } from "lucide-react";

import {
  addBrokerDeposit,
  addBrokerWithdrawal,
  getBrokerTransactions,
  deleteBrokerCashTransaction,
} from "@/lib/data/portfolio/brokers";
import type { Broker, BrokerTransactionRow } from "@/types/portfolio";
import { PortfolioTransactionTypeLabels } from "@/lib/enums";

import Modal from "@/components/shared/Modal";
import ConfirmDeleteDialog from "@/components/shared/ConfirmDeleteDialog";
import { DatePicker } from "@/components/shared/DatePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEUR } from "@/lib/utils";

export default function BrokerSection({
  broker,
  children,
  onChange,
}: {
  broker: Broker;
  children: ReactNode;
  onChange: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  //Ouverture d'une modal
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<"DEPOSIT" | "WITHDRAWAL">("DEPOSIT");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [transactions, setTransactions] = useState<BrokerTransactionRow[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());

  //Ouverture de l'historique des transactions
  function handleOpenHistory() {
    setHistoryOpen(true);
    setLoadingHistory(true);
    getBrokerTransactions(broker.id)
      .then(setTransactions)
      .catch(() => toast.error("Impossible de charger l'historique."))
      .finally(() => setLoadingHistory(false));
  }

  function handleCloseMovement() {
    setMovementOpen(false);
    setAmount("");
    setDate(new Date());
  }

  //Ajouter un mouvement
  async function handleSubmitMovement() {
    const parsedAmount = Number(amount);

    if (parsedAmount == 0) {
      toast.error("Merci de saisir un montant.");
      return;
    }

    if (!date) {
      toast.error("Merci de choisir une date.");
      return;
    }

    startTransition(async () => {
      try {
        const res =
          movementType === "DEPOSIT"
            ? await addBrokerDeposit({ brokerId: broker.id, amount: parsedAmount, date })
            : await addBrokerWithdrawal({ brokerId: broker.id, amount: parsedAmount, date });
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success(res.message);
        handleCloseMovement();
        onChange();
      } catch {
        toast.error("Opération impossible.");
      }
    });
  }

  //Suppression d'une transaction
  async function handleDeleteTransaction(id: string) {
    startTransition(async () => {
      try {
        const res = await deleteBrokerCashTransaction(id);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        setTransactions((prev) => prev?.filter((t) => t.id !== id) ?? null);
        toast.success(res.message);
        onChange();
      } catch {
        toast.error("Suppression impossible.");
      }
    });
  }

  return (
    <div
      className="space-y-3 rounded-2xl border p-4"
      style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-surface)" }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: "var(--color-investment-bg)" }}
        >
          <Landmark className="size-4" style={{ color: "var(--color-investment)" }} />
        </div>
        <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {broker.name}
        </p>
        <div className="flex-1" />
        <div className="text-right">
          <p className="text-xs" style={{ color: "var(--color-text-caption)" }}>
            Cash disponible
          </p>
          <p className="text-lg font-bold" style={{ color: "var(--color-text-primary)" }}>
            {formatEUR(broker.cashBalance)}
          </p>
        </div>
      </div>

      {/* Boutons Depot / Retrait / Historique */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setMovementType("DEPOSIT");
            setMovementOpen(true);
          }}
        >
          <Plus className="size-3.5" /> Dépôt
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            setMovementType("WITHDRAWAL");
            setMovementOpen(true);
          }}
        >
          <Minus className="size-3.5" /> Retrait
        </Button>
        <Button size="sm" variant="outline" onClick={handleOpenHistory}>
          <History className="size-3.5" /> Historique
        </Button>
      </div>

      {/* Portfolio liees à ce courtier */}
      <div className="space-y-3 pl-2">{children}</div>

      {/* Modal de depot ou de retrait */}
      <Modal
        title={`${movementType === "DEPOSIT" ? "Dépôt" : "Retrait"} — ${broker.name}`}
        open={movementOpen}
        confirmLabel={isPending ? "Enregistrement..." : "Confirmer"}
        onClose={handleCloseMovement}
        onConfirm={handleSubmitMovement}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Montant</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker value={date} onChange={setDate} maxDate={new Date()} />
          </div>
        </div>
      </Modal>

      {/* Modal sur l'historique des transactions du courtier */}
      <Modal
        title={`Historique — ${broker.name}`}
        open={historyOpen}
        confirmLabel="Fermer"
        onClose={() => setHistoryOpen(false)}
        onConfirm={() => setHistoryOpen(false)}
      >
        <div className="max-h-[60vh] space-y-1 overflow-y-auto">
          {loadingHistory && (
            <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-caption)" }}>
              Chargement...
            </p>
          )}
          {!loadingHistory && transactions?.length === 0 && (
            <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-caption)" }}>
              Aucun mouvement.
            </p>
          )}
          {!loadingHistory &&
            transactions?.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-50">
                <div>
                  <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                    {PortfolioTransactionTypeLabels[t.type] ?? t.type}
                    {t.type === "INTERNAL_TRANSFER" && t.counterpartyLabel
                      ? ` — ${t.amount >= 0 ? "depuis" : "vers"} ${t.counterpartyLabel}`
                      : t.portfolioTransaction?.asset
                        ? ` — ${t.portfolioTransaction.asset.name}`
                        : t.portfolio && ` — ${t.portfolio.name}`}
                  </p>
                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                    {new Date(t.date).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <p
                      className="text-sm font-semibold tabular-nums"
                      style={{
                        color: t.amount >= 0 ? "var(--color-success)" : "var(--color-danger)",
                      }}
                    >
                      {t.amount >= 0 ? "+" : ""}
                      {formatEUR(t.amount)}
                    </p>
                    <p className="text-xs tabular-nums" style={{ color: "var(--color-text-caption)" }}>
                      Solde : {formatEUR(t.balanceAfter)}
                    </p>
                  </div>
                  {/* Dialog de suppression d'un mouvement */}
                  {!t.portfolioTransactionId && (
                    <ConfirmDeleteDialog
                      title="Supprimer ce mouvement ?"
                      description="Cette action est irréversible."
                      onConfirm={() => handleDeleteTransaction(t.id)}
                      trigger={
                        <Button variant="ghost" size="icon" className="size-6" disabled={isPending}>
                          <Trash className="size-3" />
                        </Button>
                      }
                    />
                  )}
                </div>
              </div>
            ))}
        </div>
      </Modal>
    </div>
  );
}
