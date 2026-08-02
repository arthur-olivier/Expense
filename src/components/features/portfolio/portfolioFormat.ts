// helpers de formatage pour l'affichage des portefeuilles

// pourcentage signé, 1 décimale, ex "+17.2%"
export function formatPct(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

// ancienneté en années au-delà d'un an, sinon en mois
export function formatAnciennete(annees: number): string {
  if (annees >= 1) return `${annees.toFixed(1)} an${annees >= 2 ? "s" : ""}`;
  const mois = Math.max(0, Math.round(annees * 12));
  return `${mois} mois`;
}

// Date vers le format d'un input date : AAAA-MM-JJ
export function toDateInputValue(date: Date) {
  return new Date(date).toISOString().slice(0, 10);
}
