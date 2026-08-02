"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ScenarioPoint, yTickFormatter } from "@/lib/calculations/epargne-calculations";
import { ChartTooltip } from "./ChartTooltip";

interface RateScenarioChartProps {
  data: ScenarioPoint[];
}

// légende maison (pas celle de Recharts) pour maîtriser le style
// garder les couleurs alignées sur les stroke des <Line> plus bas
const LEGEND_ITEMS = [
  { label: "3% / an", color: "#94a3b8" },
  { label: "7% / an", color: "var(--color-investment)" },
  { label: "10% / an", color: "var(--color-success)" },
];

// styles inline : Recharts injecte ça dans un wrapper absolu où Tailwind passe mal
function RateLegend() {
  return (
    <ul
      style={{
        display: "flex",
        justifyContent: "center",
        gap: 16,
        margin: 0,
        marginTop: 8,
        padding: 0,
        listStyle: "none",
        fontSize: 11,
        color: "var(--color-text-caption)",
      }}
    >
      {LEGEND_ITEMS.map((item) => (
        <li key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* pastille de couleur devant le label */}
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: item.color,
            }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export function RateScenarioChart({ data }: RateScenarioChartProps) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-1 flex-col min-h-0"
      style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}
    >
      <p className="mb-1 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
        Comparatif de scénarios de taux
      </p>
      <p className="mb-4 text-xs" style={{ color: "var(--color-text-caption)" }}>
        Sensibilité du capital final au taux de rendement annuel
      </p>
      {/* mobile : hauteur fixe (sinon ResponsiveContainer calcule 0) ; desktop : remplit la carte */}
      <div className="h-[260px] md:h-auto md:flex-1 md:min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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

            {/* colorizeValues={false} : 3 courbes du même type, on ne colore pas les montants du tooltip */}
            <Tooltip content={<ChartTooltip colorizeValues={false} />} />
            <Legend content={<RateLegend />} />

            {/* une Line par scénario ; le 7% plus épais = référence, les autres encadrent bas/haut */}
            <Line type="monotone" dataKey="taux3" name="3% / an" stroke="#94a3b8" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="taux7" name="7% / an" stroke="var(--color-investment)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="taux10" name="10% / an" stroke="var(--color-success)" strokeWidth={1.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
