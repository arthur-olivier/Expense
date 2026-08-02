import { CategoryLabels, CategoryColors } from "@/lib/enums";
import { formatEUR } from "@/lib/utils";
import type { DashboardData } from "./types";

type Props = {
  depensesParCategorie: DashboardData["depensesParCategorie"];
};

// dépenses du mois par catégorie, barres triées desc, la plus grosse donne l'échelle
export function DepensesCategorieCard({ depensesParCategorie }: Props) {
  const rows = Object.entries(depensesParCategorie)
    .map(([category, amount]) => ({
      category: Number(category),
      label: CategoryLabels[Number(category)],
      color: CategoryColors[Number(category)],
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const max = rows[0]?.amount ?? 0;

  return (
    <div className="rounded-2xl p-5 md:p-6" style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Par catégorie
        </p>
        <span className="text-xs" style={{ color: "var(--color-text-caption)" }}>
          {rows.length}
        </span>
      </div>

      {rows.length > 0 ? (
        <div className="flex flex-col gap-3">
          {rows.map((r) => (
            <div key={r.category}>
              <div className="mb-1 flex justify-between text-[13px]">
                <span style={{ color: "var(--color-text-primary)" }}>{r.label}</span>
                <span style={{ color: "var(--color-text-secondary)" }}>{formatEUR(r.amount)}</span>
              </div>
              <div className="h-1 overflow-hidden rounded-full" style={{ background: "var(--color-bg-surface)" }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${max > 0 ? (r.amount / max) * 100 : 0}%`, background: r.color }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--color-text-caption)" }}>
          Aucune dépense ce mois-ci
        </p>
      )}
    </div>
  );
}
