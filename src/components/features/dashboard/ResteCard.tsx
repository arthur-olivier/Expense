import { formatEUR } from "@/lib/utils";

type Props = {
  reste: number;
  revenus: number;
  depenses: number;
  placements: number;
  evolution: number | null; // évolution vs mois précédent, null = pas de comparaison
};

// reste en fin de mois: barre revenus = dépenses + placements + reste, légende, 3 chiffres clés
export function ResteCard({ reste, revenus, depenses, placements, evolution }: Props) {
  // parts de la barre, bornées à 100% si dépenses + placements > revenus
  const depensesPct = revenus > 0 ? Math.min((depenses / revenus) * 100, 100) : 0;
  const placementsPct = revenus > 0 ? Math.min((placements / revenus) * 100, 100 - depensesPct) : 0;
  // taux d'épargne = part des revenus non dépensée
  const tauxEpargne = revenus > 0 ? ((revenus - depenses) / revenus) * 100 : 0;

  return (
    <div
      className="rounded-2xl px-5 py-5 md:px-7 md:py-6"
      style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}
    >
      <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
        Reste à la fin du mois
      </p>

      <div className="mt-1.5 flex items-baseline gap-2.5">
        <span
          className="text-4xl font-bold tracking-tight"
          style={{ color: reste >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
        >
          {formatEUR(reste)}
        </span>
        {evolution !== null && (
          <span
            className="rounded-full px-2 py-0.5 text-xs font-semibold"
            style={{
              color: evolution >= 0 ? "var(--color-success)" : "var(--color-danger)",
              background: evolution >= 0 ? "var(--color-success-bg)" : "var(--color-danger-bg)",
            }}
          >
            {evolution >= 0 ? "+" : ""}
            {evolution.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
          </span>
        )}
      </div>

      {/* barre: dépenses (rouge) + placements (violet) + reste (gris) */}
      <div className="my-4 flex h-1.5 overflow-hidden rounded-full" style={{ background: "var(--color-bg-surface)" }}>
        <span style={{ width: `${depensesPct}%`, background: "var(--color-danger)" }} />
        <span style={{ width: `${placementsPct}%`, background: "var(--color-investment)" }} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: "var(--color-text-secondary)" }}>
        <span className="flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-sm" style={{ background: "var(--color-danger)" }} />
          Dépenses {formatEUR(depenses)}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-sm" style={{ background: "var(--color-investment)" }} />
          Placements {formatEUR(placements)}
        </span>
        <span className="ml-auto" style={{ color: "var(--color-text-caption)" }}>
          sur {formatEUR(revenus)} de revenus
        </span>
      </div>

      {/* 3 chiffres clés */}
      <dl
        className="mt-4 grid grid-cols-3 gap-2.5 border-t pt-3.5"
        style={{ borderColor: "var(--color-border-subtle)" }}
      >
        <div>
          <dt className="text-xs" style={{ color: "var(--color-text-caption)" }}>Revenus</dt>
          <dd className="text-[15px] font-medium" style={{ color: "var(--color-text-primary)" }}>{formatEUR(revenus)}</dd>
        </div>
        <div>
          <dt className="text-xs" style={{ color: "var(--color-text-caption)" }}>Dépenses</dt>
          <dd className="text-[15px] font-medium" style={{ color: "var(--color-text-primary)" }}>{formatEUR(depenses)}</dd>
        </div>
        <div>
          <dt className="text-xs" style={{ color: "var(--color-text-caption)" }}>Taux d&apos;épargne</dt>
          <dd className="text-[15px] font-medium" style={{ color: "var(--color-text-primary)" }}>
            {tauxEpargne.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %
          </dd>
        </div>
      </dl>
    </div>
  );
}
