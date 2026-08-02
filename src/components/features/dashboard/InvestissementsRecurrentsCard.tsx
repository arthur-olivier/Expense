import { formatEUR } from "@/lib/utils";
import type { DashboardData } from "./types";

type Props = {
  activeInvestments: DashboardData["activeInvestments"];
  totalRecurringMonthly: number;
};

// placements auto encore actifs
export function InvestissementsRecurrentsCard({ activeInvestments, totalRecurringMonthly }: Props) {
  return (
    <div className="rounded-2xl p-5 md:p-6" style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Investissements récurrents
        </p>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: "var(--color-investment)", background: "var(--color-investment-bg)" }}
        >
          {formatEUR(totalRecurringMonthly)} / mois
        </span>
      </div>

      {activeInvestments.length > 0 ? (
        <div className="flex flex-col">
          {activeInvestments.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center gap-3 border-b py-2.5 last:border-0"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <span
                className="w-8 shrink-0 text-center text-[11px] leading-tight"
                style={{ color: "var(--color-text-caption)" }}
              >
                le
                <br />
                {String(inv.date.getDate()).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px]" style={{ color: "var(--color-text-primary)" }}>{inv.label}</span>
                <span className="block truncate text-[11px]" style={{ color: "var(--color-text-caption)" }}>{inv.account.name}</span>
              </span>
              <span className="text-[13px] font-medium" style={{ color: "var(--color-investment)" }}>
                +{formatEUR(inv.amount)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm" style={{ color: "var(--color-text-caption)" }}>
          Aucun investissement récurrent actif
        </p>
      )}
    </div>
  );
}
