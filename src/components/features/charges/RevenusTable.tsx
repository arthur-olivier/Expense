"use client";

import { Button } from "@/components/ui/button";
import ConfirmDeleteDialog from "@/components/shared/ConfirmDeleteDialog";
import DataTable, { type Column } from "@/components/shared/DataTable";
import { formatEUR } from "@/lib/utils";
import type { Revenu } from "@/types/finance";
import { COL, DateBadge, RecurrenceBadge } from "./ChargeTableShared";

type Props = {
  revenus: Revenu[];
  isPastMonth: boolean;
  onEdit: (revenu: Revenu) => void;
  onDelete: (id: number) => void;
};

const columns: Column<Revenu>[] = [
  {
    header: "Label",
    className: COL.label,
    cellClassName: "font-medium",
    cellStyle: () => ({ color: "var(--color-text-primary)" }),
    render: (r) => r.label,
    mobileRole: "primary",
  },
  {
    header: "Montant",
    className: COL.amount,
    cellClassName: "font-semibold",
    cellStyle: () => ({ color: "var(--color-success)" }),
    render: (r) => `+${formatEUR(r.amount)}`,
    mobileRole: "amount",
  },
  {
    header: "Date",
    className: COL.date,
    cellClassName: "tabular-nums",
    render: (r) => <DateBadge date={r.date} />,
  },
  {
    header: "Récurrence",
    className: COL.recurrence,
    render: (r) => <RecurrenceBadge isRecurring={r.isRecurring} />,
  },
];

export default function RevenusTable({ revenus, isPastMonth, onEdit, onDelete }: Props) {
  return (
    <DataTable
      rows={revenus}
      columns={columns}
      getRowId={(r) => r.id}
      emptyMessage="Aucun revenu configuré"
      actions={
        // mois passé: lecture seule, pas d'actions
        isPastMonth
          ? undefined
          : (r) => (
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => onEdit(r)}>
                  Modifier
                </Button>
                <ConfirmDeleteDialog
                  title="Supprimer ce revenu ?"
                  description={`${r.label} sera définitivement supprimé.`}
                  warning={r.isRecurring ? "Ce revenu est récurrent. La récurrence sera arrêtée." : undefined}
                  onConfirm={() => onDelete(r.id)}
                />
              </div>
            )
      }
    />
  );
}
