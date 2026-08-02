"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import Modal from "@/components/shared/Modal";
import { MONTH_NAMES, CategoryLabels } from "@/lib/enums";
import { getExportData, type ExportScope } from "@/actions/charges/export.actions";
import { exportToExcel } from "@/lib/exportExcel";
import { expandRecurring } from "@/lib/calculations/expandRecurring";

type Props = {
  year: number;
  month: number;
};

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-FR");
}

function getRangeForScope(
  scope: ExportScope,
  year: number,
  month: number,
): { start: Date; end: Date } {
  const today = new Date();

  if (scope === "year") {
    return {
      start: new Date(year, 0, 1),
      end: new Date(Math.min(new Date(year, 11, 31, 23, 59, 59).getTime(), today.getTime())),
    };
  }

  if (scope === "all") {
    return { start: new Date(2000, 0, 1), end: today };
  }

  // "month": pas d'expansion, juste la plage du mois
  return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
}

export default function ExportDialog({ year, month }: Props) {
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<ExportScope>("month");
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const { revenus, depenses, investments } = await getExportData(scope, year, month);

      const filenameMap: Record<ExportScope, string> = {
        month: `charges_${MONTH_NAMES[month]}_${year}`,
        year: `charges_${year}`,
        all: "charges",
      };

      const shouldExpand = scope === "year" || scope === "all";
      const { start, end } = getRangeForScope(scope, year, month);

      const expandedRevenus = shouldExpand ? expandRecurring(revenus, start, end) : revenus;
      const expandedDepenses = shouldExpand ? expandRecurring(depenses, start, end) : depenses;
      const expandedInvestments = shouldExpand
        ? expandRecurring(investments, start, end)
        : investments;

      exportToExcel(filenameMap[scope], [
        {
          name: "Revenus",
          headers: ["Label", "Montant (€)", "Date"],
          rows: expandedRevenus.map((r) => [r.label, r.amount, formatDate(r.date)]),
        },
        {
          name: "Dépenses",
          headers: ["Label", "Montant (€)", "Date", "Catégorie"],
          rows: expandedDepenses.map((d) => [
            d.label,
            d.amount,
            formatDate(d.date),
            CategoryLabels[d.category],
          ]),
        },
        {
          name: "Placements",
          headers: ["Label", "Montant (€)", "Date", "Compte", "Poche"],
          rows: expandedInvestments.map((i) => [
            i.label,
            i.amount,
            formatDate(i.date),
            i.account.name,
            i.category?.name ?? "",
          ]),
        },
      ]);

      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  const options: { value: ExportScope; label: string; description: string }[] = [
    {
      value: "month",
      label: `Ce mois · ${MONTH_NAMES[month]} ${year}`,
      description: "Revenus, dépenses et placements du mois affiché",
    },
    {
      value: "year",
      label: `Cette année · ${year}`,
      description: "Toutes les occurrences de l'année, mois par mois",
    },
    {
      value: "all",
      label: "Tout",
      description: "L'intégralité de vos données, occurrence par occurrence",
    },
  ];

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <FileDown className="mr-2 h-4 w-4" />
        Exporter en Excel
      </Button>

      <Modal
        title="Exporter en Excel"
        open={open}
        confirmLabel={loading ? "Export en cours…" : "Exporter"}
        onClose={() => setOpen(false)}
        onConfirm={handleExport}
      >
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Le fichier contiendra 3 onglets : <strong>Revenus</strong>, <strong>Dépenses</strong> et{" "}
            <strong>Placements</strong>.
          </p>
          <div className="space-y-2">
            {options.map((opt) => (
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
