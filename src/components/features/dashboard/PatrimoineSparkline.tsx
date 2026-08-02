"use client";

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatEUR } from "@/lib/utils";
import type { DashboardData } from "./types";

type Props = {
  patrimoineEvolution: DashboardData["patrimoineEvolution"];
};

// tooltip survol: mois + valeur du patrimoine
function SparklineTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs"
      style={{
        background: "var(--color-bg-card)",
        boxShadow: "var(--shadow-card-lg)",
        border: "1px solid var(--color-border-default)",
      }}
    >
      <p className="mb-0.5 capitalize" style={{ color: "var(--color-text-caption)" }}>
        {label}
      </p>
      <p className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
        {formatEUR(payload[0].value)}
      </p>
    </div>
  );
}

// courbe patrimoine 6 mois, aire dégradée; client-only car Recharts a besoin du DOM, axes masqués
export function PatrimoineSparkline({ patrimoineEvolution }: Props) {
  return (
    <div className="my-4 h-14 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={patrimoineEvolution} margin={{ top: 6, right: 2, left: 2, bottom: 0 }}>
          <defs>
            {/* dégradé vertical: opaque en haut, transparent en bas */}
            <linearGradient id="patrimoine-spark" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-investment)" stopOpacity={0.28} />
              <stop offset="95%" stopColor="var(--color-investment)" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          {/* axes masqués, on garde juste la courbe */}
          <XAxis dataKey="label" hide />
          <YAxis domain={["dataMin", "dataMax"]} hide />

          {/* Trait vertical discret au survol */}
          <Tooltip
            content={<SparklineTooltip />}
            cursor={{ stroke: "var(--color-border-strong)", strokeWidth: 1 }}
          />

          <Area
            type="monotone"
            dataKey="balance"
            stroke="var(--color-investment)"
            strokeWidth={2}
            fill="url(#patrimoine-spark)"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0, fill: "var(--color-investment)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
