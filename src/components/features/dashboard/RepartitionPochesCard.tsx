import { formatEUR } from "@/lib/utils";
import type { DashboardData } from "./types";

type Props = {
  categorySlices: DashboardData["categorySlices"];
  totalPatrimoine: number;
};

// épargne par poche: barre empilée, détail chiffré, poids de la plus grosse
export function RepartitionPochesCard({ categorySlices, totalPatrimoine }: Props) {
  const pochesTotal = categorySlices.reduce((sum, c) => sum + c.value, 0);
  const top = categorySlices[0];
  const topPct = top && totalPatrimoine > 0 ? (top.value / totalPatrimoine) * 100 : 0;

  return (
    <div className="rounded-2xl p-5 md:p-6" style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Par poche
        </p>
        <span className="text-xs" style={{ color: "var(--color-text-caption)" }}>
          {categorySlices.length}
        </span>
      </div>

      {categorySlices.length > 0 ? (
        <>
          {/* barre empilée: une part par poche selon son solde */}
          <div className="mb-3.5 flex h-1.5 overflow-hidden rounded-full">
            {categorySlices.map((c) => (
              <span
                key={c.id}
                style={{ width: `${pochesTotal > 0 ? (c.value / pochesTotal) * 100 : 0}%`, background: c.color }}
              />
            ))}
          </div>

          <div className="flex flex-col gap-3">
            {categorySlices.map((c) => (
              <div key={c.id} className="flex items-center justify-between gap-2 text-[13px]">
                <span className="flex min-w-0 items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                  <i className="h-1.5 w-1.5 shrink-0 rounded-sm" style={{ background: c.color }} />
                  <span className="truncate">{c.label}</span>
                </span>
                <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{formatEUR(c.value)}</span>
              </div>
            ))}
          </div>

          {top && (
            <p className="mt-3 border-t pt-2.5 text-xs" style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-caption)" }}>
              {top.label} : {topPct.toFixed(0)} % du patrimoine
            </p>
          )}
        </>
      ) : (
        <p className="text-sm" style={{ color: "var(--color-text-caption)" }}>
          Aucune poche définie
        </p>
      )}
    </div>
  );
}
