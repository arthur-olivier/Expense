type RecurringItem = {
  date: Date | string;
  isRecurring: boolean;
  dateEndRecurring?: Date | string | null;
};

/**
 * Déploie les récurrents en une entrée par mois sur [rangeStart, rangeEnd].
 * Les non-récurrents sont inclus tels quels si leur date est dans l'intervalle. Résultat trié par date croissante.
 */
export function expandRecurring<T extends RecurringItem>(
  items: T[],
  rangeStart: Date,
  rangeEnd: Date,
): (T & { date: Date })[] {
  const result: (T & { date: Date })[] = [];

  for (const item of items) {
    const itemDate = new Date(item.date);

    if (!item.isRecurring) {
      if (itemDate >= rangeStart && itemDate < rangeEnd) {
        result.push({ ...item, date: itemDate });
      }
      continue;
    }

    const itemEndDate = item.dateEndRecurring ? new Date(item.dateEndRecurring) : rangeEnd;
    const effectiveEnd = itemEndDate < rangeEnd ? itemEndDate : rangeEnd;

    const itemMonthStart = new Date(itemDate.getFullYear(), itemDate.getMonth(), 1);
    const rangeMonthStart = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    let cursor = itemMonthStart > rangeMonthStart ? itemMonthStart : rangeMonthStart;

    while (cursor <= effectiveEnd) {
      result.push({
        ...item,
        date: new Date(cursor.getFullYear(), cursor.getMonth(), itemDate.getDate()),
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  }

  return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}
