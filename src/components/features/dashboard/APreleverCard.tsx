import { CategoryLabels } from "@/lib/enums";
import { formatEUR } from "@/lib/utils";
import type { DashboardData } from "./types";

type Props = {
  depensesRestantes: DashboardData["depensesRestantes"];
  investmentsRestants: DashboardData["investmentsRestants"];
  totalAPrelever: number;
};

// échéances (dépenses + placements) restantes du mois, triées par jour
export function APreleverCard({ depensesRestantes, investmentsRestants, totalAPrelever }: Props) {
  const items = [
    ...depensesRestantes.map((d) => ({
      key: `depense-${d.id}`,
      kind: "depense" as const,
      label: d.label,
      subtitle: CategoryLabels[d.category],
      amount: d.amount,
      date: d.date,
    })),
    ...investmentsRestants.map((i) => ({
      key: `placement-${i.id}`,
      kind: "placement" as const,
      label: i.label,
      subtitle: i.account.name,
      amount: i.amount,
      date: i.date,
    })),
  ].sort((a, b) => a.date.getDate() - b.date.getDate());

  return (
    <div className="rounded-2xl p-5 md:p-6" style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          À prélever ce mois-ci
        </p>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: "var(--color-warning)", background: "var(--color-warning-bg)" }}
        >
          {items.length} · {formatEUR(totalAPrelever)}
        </span>
      </div>

      {items.length > 0 ? (
        <div className="flex flex-col">
          {items.map((item) => (
            <div
              key={item.key}
              className="flex items-center gap-3 border-b py-2.5 last:border-0"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <span
                className="w-8 shrink-0 text-center text-[11px] leading-tight"
                style={{ color: "var(--color-text-caption)" }}
              >
                {String(item.date.getDate()).padStart(2, "0")}
                <br />
                {item.date.toLocaleString("fr-FR", { month: "short" })}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]" style={{ color: "var(--color-text-primary)" }}>{item.label}</span>
                <span className="block truncate text-[11px]" style={{ color: "var(--color-text-caption)" }}>{item.subtitle}</span>
              </span>
              <span
                className="text-[13px] font-medium"
                style={{ color: item.kind === "placement" ? "var(--color-investment)" : "var(--color-danger)" }}
              >
                {item.kind === "placement" ? "+" : "−"}
                {formatEUR(item.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm" style={{ color: "var(--color-text-caption)" }}>
          Tout est réglé pour ce mois-ci
        </p>
      )}
    </div>
  );
}
