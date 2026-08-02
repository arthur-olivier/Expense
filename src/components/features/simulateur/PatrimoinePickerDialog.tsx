"use client";

import { useState, useEffect, useTransition } from "react";
import { Wallet, ChevronRight, Loader2 } from "lucide-react";
import Modal from "@/components/shared/Modal";
import { fmt } from "@/lib/calculations/epargne-calculations";
import { getPatrimoineBreakdown, type PatrimoineBreakdown } from "@/actions/simulateur.actions";

interface PatrimoinePickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (amount: number) => void;
}

export function PatrimoinePickerDialog({ open, onOpenChange, onSelect }: PatrimoinePickerDialogProps) {
  const [data, setData] = useState<PatrimoineBreakdown | null>(null);
  const [isPending, startTransition] = useTransition();

  // fetch au 1er open, pas de refetch si data déjà là
  useEffect(() => {
    if (!open || data) return;
    startTransition(async () => {
      const result = await getPatrimoineBreakdown();
      setData(result);
    });
  }, [open, data]);

  function pick(amount: number) {
    onSelect(Math.round(amount));
    onOpenChange(false);
  }

  return (
    <Modal
      title="Choisir un montant de départ"
      open={open}
      confirmLabel="Fermer"
      onClose={() => onOpenChange(false)}
      onConfirm={() => onOpenChange(false)}
    >
      {isPending || !data ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--color-text-muted)" }} />
        </div>
      ) : (
        <div className="-mx-4 overflow-y-auto max-h-[60vh]">
          {/* total */}
          <PickRow
            label="Tout le patrimoine"
            amount={data.totalPatrimoine}
            bold
            icon={<Wallet size={14} />}
            onClick={() => pick(data.totalPatrimoine)}
          />

          {/* séparateur */}
          <div className="mx-5 my-1 border-t" style={{ borderColor: "var(--color-border-subtle)" }} />

          {/* comptes */}
          {data.accounts.map((account) => (
            <div key={account.id}>
              <PickRow label={account.name} amount={account.balance} onClick={() => pick(account.balance)} />
              {account.categories.map((cat) => (
                <PickRow key={cat.id} label={cat.name} amount={cat.balance} indented onClick={() => pick(cat.balance)} />
              ))}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ----------------------- une ligne de sélection

interface PickRowProps {
  label: string;
  amount: number;
  bold?: boolean;
  indented?: boolean;
  icon?: React.ReactNode;
  onClick: () => void;
}

function PickRow({ label, amount, bold, indented, icon, onClick }: PickRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full flex items-center justify-between gap-3 px-5 py-2.5 text-left transition-colors hover:bg-muted/50"
      style={{ paddingLeft: indented ? "2.25rem" : undefined }}
    >
      <span
        className="flex items-center gap-2 text-sm truncate"
        style={{
          color: bold ? "var(--color-text-primary)" : "var(--color-text-secondary)",
          fontWeight: bold ? 600 : 400,
        }}
      >
        {icon}
        {label}
      </span>
      <span
        className="shrink-0 flex items-center gap-1 text-sm font-semibold tabular-nums"
        style={{ color: "var(--color-investment)" }}
      >
        {fmt(amount)}
        <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      </span>
    </button>
  );
}
