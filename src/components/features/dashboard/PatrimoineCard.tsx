import { Wallet } from "lucide-react";
import { formatEUR } from "@/lib/utils";
import { PatrimoineSparkline } from "./PatrimoineSparkline";
import type { DashboardData } from "./types";

type Props = {
  totalPatrimoine: number;
  totalLiquide: number;
  totalLocked: number;
  totalPatrimoineBoursier: number;
  patrimoineEvolution: DashboardData["patrimoineEvolution"];
};

export function PatrimoineCard({
  totalPatrimoine,
  totalLiquide,
  totalLocked,
  totalPatrimoineBoursier,
  patrimoineEvolution,
}: Props) {
  const balances = patrimoineEvolution.map((p) => p.balance);
  // delta = dernier solde - avant-dernier
  const delta =
    balances.length >= 2 ? balances[balances.length - 1] - balances[balances.length - 2] : 0;

  return (
    <div
      className="flex flex-col rounded-2xl px-5 py-5 md:px-7 md:py-6"
      style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          Patrimoine total
        </span>
        <Wallet size={16} style={{ color: "var(--color-text-caption)" }} />
      </div>

      <p className="mt-1.5 text-[26px] font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
        {formatEUR(totalPatrimoine)}
      </p>
      {delta !== 0 && (
        <p className="mt-0.5 text-xs" style={{ color: delta >= 0 ? "var(--color-success)" : "var(--color-danger)" }}>
          {delta >= 0 ? "▲" : "▼"} {delta >= 0 ? "+" : ""}
          {formatEUR(delta)} ce mois
        </p>
      )}

      {patrimoineEvolution.length > 1 && <PatrimoineSparkline patrimoineEvolution={patrimoineEvolution} />}

      {/* Répartition liquide / bloqué (+ bourse si présente) */}
      <dl
        className="mt-auto flex justify-between gap-3 border-t pt-3"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <div>
          <dt className="text-xs" style={{ color: "var(--color-text-caption)" }}>Liquide</dt>
          <dd className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{formatEUR(totalLiquide)}</dd>
        </div>
        <div className="text-right">
          <dt className="text-xs" style={{ color: "var(--color-text-caption)" }}>Bloqué</dt>
          <dd className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>{formatEUR(totalLocked)}</dd>
        </div>
        {totalPatrimoineBoursier > 0 && (
          <div className="text-right">
            <dt className="text-xs" style={{ color: "var(--color-text-caption)" }}>Bourse</dt>
            <dd className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              {formatEUR(totalPatrimoineBoursier)}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
