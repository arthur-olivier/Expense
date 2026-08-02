interface Stat {
  label: string;
  value: string;
  color: string;
}

interface StatsGridProps {
  stats: Stat[];
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      {stats.map((stat) => (
        <div key={stat.label} className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "var(--color-text-muted)" }}>
            {stat.label}
          </p>
          <p className="mt-1 text-lg font-bold md:text-2xl" style={{ color: stat.color }}>
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
