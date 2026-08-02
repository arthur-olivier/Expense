import { Skeleton } from "@/components/ui/skeleton";
import { formatEUR } from "@/lib/utils";
import type { AssetPerformance } from "@/types/portfolio";
import { formatPct, formatAnciennete } from "./portfolioFormat";

export function AssetPerfDetail({ loading, perf }: { loading: boolean; perf: AssetPerformance | undefined }) {
  //Skeleton pendant le chargement
  if (loading || !perf) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  const investiNet = perf.totalAchats - perf.totalVentes - perf.totalDividendes;
  const triPct = perf.tri !== null ? perf.tri * 100 : null;
  const triColor =
    perf.tri === null ? "var(--color-text-caption)" : perf.tri >= 0 ? "var(--color-success)" : "var(--color-danger)";

  return (
    <div className="space-y-3">
      {/* Bandeau TRI + comparaison à l'objectif */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
        style={{ borderColor: "var(--color-border-subtle)", background: "var(--color-bg-surface)" }}
      >
        <div>
          <p className="text-xs" style={{ color: "var(--color-text-caption)" }}>
            Rendement annualisé (TRI)
          </p>
          {triPct !== null ? (
            <p className="text-2xl font-bold tabular-nums" style={{ color: triColor }}>
              {formatPct(triPct)}
              <span className="text-sm font-normal" style={{ color: "var(--color-text-caption)" }}>
                {" "}
                /an
              </span>
            </p>
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-caption)" }}>
              Non calculable — renseigne un cours ou attends un peu d&apos;historique.
            </p>
          )}
        </div>
      </div>

      {perf.tri !== null && !perf.triFiable && (
        <p
          className="rounded-lg px-3 py-2 text-xs"
          style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)" }}
        >
          Moins de 3 mois d&apos;historique : le rendement annualisé est encore très volatil, à prendre avec des pincettes.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile
          label="Rendement total"
          value={perf.rendementTotalSimple !== null ? formatPct(perf.rendementTotalSimple * 100) : "—"}
          color={
            perf.rendementTotalSimple === null
              ? undefined
              : perf.rendementTotalSimple >= 0
                ? "var(--color-success)"
                : "var(--color-danger)"
          }
        />
        <StatTile label="Investi net" value={formatEUR(investiNet)} />
        <StatTile
          label="+/- value latente"
          value={formatEUR(perf.plusValueLatente)}
          color={perf.plusValueLatente >= 0 ? "var(--color-success)" : "var(--color-danger)"}
        />
        <StatTile label="Ancienneté" value={formatAnciennete(perf.ancienneteAnnees)} />
      </div>

      {(perf.totalVentes > 0 || perf.totalDividendes > 0) && (
        <p className="text-xs" style={{ color: "var(--color-text-caption)" }}>
          Total acheté {formatEUR(perf.totalAchats)}
          {perf.totalVentes > 0 && ` · vendu ${formatEUR(perf.totalVentes)}`}
          {perf.totalDividendes > 0 && ` · dividendes ${formatEUR(perf.totalDividendes)}`}.
        </p>
      )}
    </div>
  );
}

export function StatTile({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
      <p className="text-xs" style={{ color: "var(--color-text-caption)" }}>
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums" style={{ color: color ?? "var(--color-text-primary)" }}>
        {value}
      </p>
    </div>
  );
}
