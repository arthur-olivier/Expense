"use client";

import { fmt } from "@/lib/calculations/epargne-calculations";

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: number;
  colorizeValues?: boolean;
}

// tooltip du graphique
export function ChartTooltip({ active, payload, label, colorizeValues = true }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-xl px-4 py-3 text-sm"
      style={{
        background: "var(--color-bg-card)",
        boxShadow: "var(--shadow-card-lg)",
        border: "1px solid var(--color-border-default)",
      }}
    >
      <p className="mb-2 font-semibold" style={{ color: "var(--color-text-primary)" }}>
        Année {label}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: "var(--color-text-muted)" }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="font-semibold" style={{ color: colorizeValues ? entry.color : "var(--color-text-primary)" }}>
            {fmt(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
