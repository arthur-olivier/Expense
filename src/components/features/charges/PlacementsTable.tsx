"use client";

import ConfirmDeleteDialog from "@/components/shared/ConfirmDeleteDialog";
import DataTable, { type Column } from "@/components/shared/DataTable";
import { formatEUR } from "@/lib/utils";
import type { Investment } from "@/types/finance";
import { COL, DateBadge, RecurrenceBadge } from "./ChargeTableShared";

type Props = {
  investments: Investment[];
  isPastMonth: boolean;
  onDelete: (id: number) => void;
};

const columns: Column<Investment>[] = [
  {
    header: "Label",
    className: COL.label,
    cellClassName: "font-medium",
    cellStyle: () => ({ color: "var(--color-text-primary)" }),
    render: (inv) => inv.label,
    mobileRole: "primary",
  },
  {
    header: "Montant",
    className: COL.amount,
    cellClassName: "font-semibold",
    cellStyle: () => ({ color: "var(--color-investment)" }),
    render: (inv) => formatEUR(inv.amount),
    mobileRole: "amount",
  },
  {
    header: "Date",
    className: COL.date,
    cellClassName: "tabular-nums",
    render: (inv) => <DateBadge date={new Date(inv.date)} />,
  },
  {
    header: "Récurrence",
    className: COL.recurrence,
    render: (inv) => <RecurrenceBadge isRecurring={inv.isRecurring} />,
  },
  {
    header: "Compte",
    render: (inv) => (
      <span
        className="rounded-md px-2 py-1 text-xs font-medium"
        style={{
          background: "var(--color-bg-surface)",
          color: "var(--color-text-secondary)",
        }}
      >
        {inv.account.name}
      </span>
    ),
  },
  {
    header: "Poche",
    render: (inv) =>
      inv.category ? (
        <span
          className="rounded-md px-2 py-1 text-xs font-medium"
          style={{
            background: "var(--color-investment-bg)",
            color: "var(--color-investment)",
          }}
        >
          {inv.category.name}
        </span>
      ) : (
        <span style={{ color: "var(--color-text-caption)" }} className="text-xs">
          —
        </span>
      ),
  },
];

export default function PlacementsTable({ investments, isPastMonth, onDelete }: Props) {
  return (
    <DataTable
      rows={investments}
      columns={columns}
      getRowId={(inv) => inv.id}
      emptyMessage="Aucun placement configuré"
      actions={
        isPastMonth
          ? undefined
          : (inv) => (
              <div className="flex items-center justify-end gap-1">
                <ConfirmDeleteDialog
                  title="Supprimer ce placement ?"
                  description={`${inv.label} sera définitivement supprimé.`}
                  warning={
                    inv.isRecurring
                      ? "Ce placement est récurrent. La récurrence sera arrêtée à partir de ce mois. Les transactions déjà générées dans les mois passés ne seront pas supprimées — si vous souhaitez les retirer, il faudra le faire manuellement depuis la section Comptes."
                      : "Les transactions associées à ce placement ne seront pas supprimées automatiquement. Si vous souhaitez les retirer, il faudra le faire manuellement depuis la section Comptes."
                  }
                  onConfirm={() => onDelete(inv.id)}
                />
              </div>
            )
      }
    />
  );
}
