"use client";

import { Button } from "@/components/ui/button";
import ConfirmDeleteDialog from "@/components/shared/ConfirmDeleteDialog";
import DataTable, { type Column } from "@/components/shared/DataTable";
import { CategoryLabels, CategoryColors } from "@/lib/enums";
import { formatEUR } from "@/lib/utils";
import type { Depense } from "@/types/finance";
import { COL, DateBadge, RecurrenceBadge } from "./ChargeTableShared";

type Props = {
  depenses: Depense[];
  isPastMonth: boolean;
  onEdit: (depense: Depense) => void;
  onDelete: (id: number) => void;
};

const columns: Column<Depense>[] = [
  {
    header: "Label",
    className: COL.label,
    cellClassName: "font-medium",
    cellStyle: () => ({ color: "var(--color-text-primary)" }),
    render: (d) => d.label,
    mobileRole: "primary",
  },
  {
    header: "Montant",
    className: COL.amount,
    cellClassName: "font-semibold",
    cellStyle: () => ({ color: "var(--color-danger)" }),
    render: (d) => `-${formatEUR(d.amount)}`,
    mobileRole: "amount",
  },
  {
    header: "Date",
    className: COL.date,
    cellClassName: "tabular-nums",
    render: (d) => <DateBadge date={d.date} />,
  },
  {
    header: "Récurrence",
    className: COL.recurrence,
    render: (d) => <RecurrenceBadge isRecurring={d.isRecurring} />,
  },
  {
    header: "Catégorie",
    render: (d) => (
      <span
        className="rounded-md px-2 py-1 text-xs font-medium text-white"
        style={{ backgroundColor: CategoryColors[d.category] }}
      >
        {CategoryLabels[d.category]}
      </span>
    ),
  },
];

export default function DepensesTable({ depenses, isPastMonth, onEdit, onDelete }: Props) {
  return (
    <DataTable
      rows={depenses}
      columns={columns}
      getRowId={(d) => d.id}
      emptyMessage="Aucune dépense configurée"
      actions={
        isPastMonth
          ? undefined
          : (d) => (
              <div className="flex items-center justify-end gap-1">
                <Button variant="outline" size="sm" onClick={() => onEdit(d)}>
                  Modifier
                </Button>
                <ConfirmDeleteDialog
                  title="Supprimer cette dépense ?"
                  description={`${d.label} sera définitivement supprimé.`}
                  warning={d.isRecurring ? "Cette dépense est récurrente. La récurrence sera arrêtée." : undefined}
                  onConfirm={() => onDelete(d.id)}
                />
              </div>
            )
      }
    />
  );
}
