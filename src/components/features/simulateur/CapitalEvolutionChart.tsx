"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DataPoint, yTickFormatter } from "@/lib/calculations/epargne-calculations";
import { ChartTooltip } from "./ChartTooltip";

interface CapitalEvolutionChartProps {
  data: DataPoint[];
  // préfixe des ids de dégradés SVG (globaux au doc) pour éviter les collisions entre 2 graphes
  gradientId: string;
}

export function CapitalEvolutionChart({ data, gradientId }: CapitalEvolutionChartProps) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-1 flex-col min-h-0"
      style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}
    >
      <p className="mb-4 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
        Évolution du capital
      </p>
      {/* mobile : hauteur fixe (sinon ResponsiveContainer calcule 0) ; desktop : remplit la carte */}
      <div className="h-[260px] md:h-auto md:flex-1 md:min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            {/* dégradés verticaux pour le fill sous les courbes : opaque en haut, transparent en bas */}
            <defs>
              <linearGradient id={`${gradientId}-valeur`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-investment)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="var(--color-investment)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`${gradientId}-verse`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-neutral)" stopOpacity={0.15} />
                <stop offset="95%" stopColor="var(--color-neutral)" stopOpacity={0.02} />
              </linearGradient>
            </defs>

            {/* grille horizontale en pointillés */}
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" vertical={false} />

            {/* axe X : champ annee, affiché "5a", "10a"... */}
            <XAxis
              dataKey="annee"
              tickFormatter={(v) => `${v}a`}
              tick={{ fill: "var(--color-text-caption)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />

            {/* axe Y : montants en k€, width réserve la place des labels */}
            <YAxis
              tickFormatter={yTickFormatter}
              tick={{ fill: "var(--color-text-caption)", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />

            {/* tooltip custom, voir ChartTooltip */}
            <Tooltip content={<ChartTooltip />} />

            {/* une Area par courbe, "verse" dessiné avant donc sous "valeur". pointillé = versements */}
            <Area
              type="monotone"
              dataKey="verse"
              name="Total versé"
              stroke="var(--color-neutral)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              fill={`url(#${gradientId}-verse)`}
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="valeur"
              name="Valeur totale"
              stroke="var(--color-investment)"
              strokeWidth={2}
              fill={`url(#${gradientId}-valeur)`}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
