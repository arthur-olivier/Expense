export const COL = {
  label: "w-[180px]",
  amount: "w-[180px]",
  date: "w-[180px]",
  recurrence: "w-[180px]",
};

function formatDayOfMonth(date: Date) {
  return `le ${date.getDate()} du mois`;
}

export function DateBadge({ date }: { date: Date }) {
  return (
    <span
      className="rounded-md px-2 py-1 text-xs"
      style={{ background: "var(--color-bg-surface)", color: "var(--color-text-muted)" }}
    >
      {formatDayOfMonth(date)}
    </span>
  );
}

export function RecurrenceBadge({ isRecurring }: { isRecurring: boolean }) {
  return (
    <span
      className="rounded-md px-2 py-1 text-xs font-medium"
      style={
        isRecurring
          ? { background: "var(--color-success-bg)", color: "var(--color-success)" }
          : { background: "var(--color-bg-surface)", color: "var(--color-text-muted)" }
      }
    >
      {isRecurring ? "Oui" : "Non"}
    </span>
  );
}
