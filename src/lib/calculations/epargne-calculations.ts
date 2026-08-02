//-------- Calculs et formatage pour le simulateur d'épargne (intérêts composés) ------

export interface DataPoint {
  annee: number;
  verse: number;
  valeur: number;
  interets: number;
}

export interface ScenarioPoint {
  annee: number;
  taux3: number;
  taux7: number;
  taux10: number;
}

const TAUX_MIN = -99;

// Convertit un taux annuel en taux mensuel équivalent
function tauxMensuel(tauxAnnuel: number): number {
  const t = Math.max(tauxAnnuel, TAUX_MIN);
  return Math.pow(1 + t / 100, 1 / 12) - 1;
}

// Calcule la valeur finale d'un capital avec versements mensuels et intérêts composés
export function calcValeur(depart: number, mensuel: number, annees: number, tauxAnnuel: number): number {
  if (annees === 0) return depart;
  const n = annees * 12;
  if (tauxAnnuel === 0) return depart + mensuel * n;
  const r = tauxMensuel(tauxAnnuel);
  return depart * Math.pow(1 + r, n) + mensuel * ((Math.pow(1 + r, n) - 1) / r);
}

// Calcule le versement mensuel nécessaire pour atteindre un objectif donné
export function calcMensuelNecessaire(objectif: number, depart: number, annees: number, tauxAnnuel: number): number {
  if (annees === 0) return 0;
  const n = annees * 12;
  const departFinal = tauxAnnuel === 0 ? depart : depart * Math.pow(1 + tauxMensuel(tauxAnnuel), n);
  const reste = objectif - departFinal;
  if (reste <= 0) return 0;
  if (tauxAnnuel === 0) return reste / n;
  const r = tauxMensuel(tauxAnnuel);
  return reste / ((Math.pow(1 + r, n) - 1) / r);
}

// Génère la courbe année par année (versé, valeur, intérêts) pour un taux donné
export function buildDataPoints(depart: number, mensuel: number, annees: number, tauxAnnuel: number): DataPoint[] {
  const points: DataPoint[] = [];
  for (let a = 0; a <= annees; a++) {
    const verse = Math.round(depart + mensuel * a * 12);
    const valeur = Math.round(calcValeur(depart, mensuel, a, tauxAnnuel));
    points.push({ annee: a, verse, valeur, interets: valeur - verse });
  }
  return points;
}

// Génère trois courbes de comparaison (taux 3 %, 7 %, 10 %) année par année
export function buildScenarios(depart: number, mensuel: number, annees: number): ScenarioPoint[] {
  const points: ScenarioPoint[] = [];
  for (let a = 0; a <= annees; a++) {
    points.push({
      annee: a,
      taux3: Math.round(calcValeur(depart, mensuel, a, 3)),
      taux7: Math.round(calcValeur(depart, mensuel, a, 7)),
      taux10: Math.round(calcValeur(depart, mensuel, a, 10)),
    });
  }
  return points;
}

// Convertit une chaîne en nombre (0 si invalide)
export function toNumber(value: string): number {
  return parseFloat(value) || 0;
}

// Formate un nombre en euros (ex: 1 234 €)
export function fmt(v: number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

// Formate les graduations de l'axe Y de façon compacte (ex: 1.5M€, 250k€)
export function yTickFormatter(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M€`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}k€`;
  return `${v}€`;
}
