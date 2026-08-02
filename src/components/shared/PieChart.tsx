// PieChart.tsx
// donut en SVG pur : slices (label, valeur, couleur) + légende, sans dépendance externe

"use client";

import { formatEUR } from "@/lib/utils";

type Slice = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  slices: Slice[];
  bgColor?: string;
  showAmount?: boolean;
  legendPosition?: "left" | "right";
};

function round(n: number) {
  return Math.round(n * 1000) / 1000;
}

export default function PieChart({
  slices,
  bgColor = "var(--color-bg-card)",
  showAmount = true,
  legendPosition = "right",
}: Props) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) return null;

  let cumulative = 0;
  const arcs = slices.map((slice) => {
    const percentage = slice.value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += percentage;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;

    const cx = 100;
    const cy = 100;
    const r = 80;

    const x1 = round(cx + r * Math.cos(startAngle));
    const y1 = round(cy + r * Math.sin(startAngle));
    const x2 = round(cx + r * Math.cos(endAngle));
    const y2 = round(cy + r * Math.sin(endAngle));

    const largeArc = percentage > 0.5 ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return { ...slice, path, percentage };
  });

  const legend = (
    <div className="flex flex-col gap-3">
      {arcs.map((arc, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: arc.color }} />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
              {arc.label}
            </p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
              {showAmount && (
                <>
                  {formatEUR(arc.value)}
                  {" · "}
                </>
              )}
              {(arc.percentage * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  const chart = (
    <div className="shrink-0">
      <svg width="180" height="180" viewBox="0 0 200 200">
        {arcs.length === 1 ? (
          <circle cx="100" cy="100" r="80" fill={arcs[0].color} />
        ) : (
          arcs.map((arc, i) => <path key={i} d={arc.path} fill={arc.color} style={{ stroke: bgColor, strokeWidth: 3 }} />)
        )}
        <circle cx="100" cy="100" r="50" style={{ fill: bgColor }} />
      </svg>
    </div>
  );

  return (
    <div className="flex items-center gap-8">
      {legendPosition === "left" ? (
        <>
          {legend}
          {chart}
        </>
      ) : (
        <>
          {chart}
          {legend}
        </>
      )}
    </div>
  );
}
