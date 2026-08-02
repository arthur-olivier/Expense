//-------- Calculs de portefeuille boursier : PRU, plus-values, fiscalité (PEA/CTO) et rendement annualisé (TRI) ------

export type PortfolioTransactionType = "BUY" | "SELL" | "DEPOSIT" | "WITHDRAWAL" | "DIVIDEND" | "FEE";

export type PortfolioKind = "PEA" | "CTO" | "PER" | "AV";

export type TransactionForCalc = {
  type: string;
  quantity: number | null;
  price: number | null;
  fees: number;
  date: Date;
};

export type PositionState = {
  quantity: number;
  pru: number;
};

export const TAUX_PFU_CTO = 30;
export const TAUX_PEA_MOINS_5_ANS = 30;
export const TAUX_PEA_PLUS_5_ANS = 17.2;
export const PEA_SEUIL_ANNEES = 5;

// Applique un achat : met à jour la quantité et recalcule le prix de revient moyen (PRU)
export function applyBuy(state: PositionState, quantity: number, price: number, fees: number): PositionState {
  const coutTotal = state.quantity * state.pru + quantity * price + fees;
  const newQuantity = state.quantity + quantity;
  return { quantity: newQuantity, pru: newQuantity > 0 ? coutTotal / newQuantity : 0 };
}

// Applique une vente : réduit la quantité et calcule la plus-value réalisée
export function applySell(
  state: PositionState,
  quantity: number,
  price: number,
  fees: number,
): { state: PositionState; plusValueRealisee: number } {
  const plusValueRealisee = quantity * (price - state.pru) - fees;
  const rawQuantity = state.quantity - quantity;
  const newQuantity = Math.abs(rawQuantity) < 1e-9 ? 0 : rawQuantity;
  return {
    state: { quantity: newQuantity, pru: newQuantity > 0 ? state.pru : 0 },
    plusValueRealisee,
  };
}

// Montant (signé négatif) que coûte un achat, frais compris
export function computeBuyAmount(quantity: number, price: number, fees: number): number {
  return -(quantity * price + fees);
}

// Montant (signé positif) que rapporte une vente, frais déduits
export function computeSellAmount(quantity: number, price: number, fees: number): number {
  return quantity * price - fees;
}

// Rejoue toutes les transactions dans l'ordre chronologique pour obtenir la position finale
export function recomputePosition(transactions: TransactionForCalc[]): PositionState {
  const sorted = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());
  let state: PositionState = { quantity: 0, pru: 0 };

  for (const tx of sorted) {
    if (tx.type === "BUY" && tx.quantity && tx.price !== null) {
      state = applyBuy(state, tx.quantity, tx.price, tx.fees);
    } else if (tx.type === "SELL" && tx.quantity && tx.price !== null) {
      state = applySell(state, tx.quantity, tx.price, tx.fees).state;
    }
  }

  return state;
}

// Montant investi restant (par restant on veut dire les acheter - les vendu) (quantité détenue × PRU)
export function computeMontantInvesti(position: PositionState): number {
  return position.quantity * position.pru;
}

// Valeur actuelle de la position (quantité × dernier cours connu)
export function computeValeurActuelle(position: PositionState, lastPrice: number | null): number {
  return position.quantity * (lastPrice ?? 0);
}

// Plus-value encore non réalisée (valeur actuelle − montant investi)
export function computePlusValueLatente(valeurActuelle: number, montantInvesti: number): number {
  return valeurActuelle - montantInvesti;
}

// Plus-value latente exprimée en pourcentage du montant investi
export function computePlusValuePct(plusValueLatente: number, montantInvesti: number): number {
  return montantInvesti !== 0 ? (plusValueLatente / montantInvesti) * 100 : 0;
}

// Ancienneté du portefeuille en années (décimales)
export function anciennetePortefeuille(openedAt: Date, atDate: Date = new Date()): number {
  const ms = atDate.getTime() - openedAt.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

// Taux d'imposition applicable : PEA (17,2 % après 5 ans, 30 % avant) ou 30 % (CTO/autres)
export function getTauxImposition(portfolioType: string, openedAt: Date, atDate: Date = new Date()): number {
  if (portfolioType === "PEA") {
    return anciennetePortefeuille(openedAt, atDate) >= PEA_SEUIL_ANNEES ? TAUX_PEA_PLUS_5_ANS : TAUX_PEA_MOINS_5_ANS;
  }
  return TAUX_PFU_CTO;
}

// Montant net qu'on récupérerait après impôt en cas de retrait maintenant
export function computeMontantNetRetrait(
  valeurActuelle: number,
  plusValueLatente: number,
  portfolioType: string,
  openedAt: Date,
  atDate: Date = new Date(),
): number {
  if (plusValueLatente <= 0) return valeurActuelle;
  const taux = getTauxImposition(portfolioType, openedAt, atDate);
  return valeurActuelle - plusValueLatente * (taux / 100);
}

// --- Rendement annualisé (TRI / XIRR) -------------------------------------

export type CashFlow = { date: Date; amount: number };

const MS_PER_YEAR = 1000 * 60 * 60 * 24 * 365.25;

// TRI annuel d'une série de flux datés et signés : le taux qui annule la VAN
// résolu numériquement (Newton-Raphson, repli dichotomie) ; null s'il n'y a pas un flux négatif ET un positif
export function computeXirr(flows: CashFlow[]): number | null {
  if (flows.length < 2) return null;

  const sorted = [...flows].sort((a, b) => a.date.getTime() - b.date.getTime());
  const t0 = sorted[0].date.getTime();
  const years = sorted.map((f) => (f.date.getTime() - t0) / MS_PER_YEAR);
  const amounts = sorted.map((f) => f.amount);

  const hasPositive = amounts.some((a) => a > 1e-9);
  const hasNegative = amounts.some((a) => a < -1e-9);
  if (!hasPositive || !hasNegative) return null;

  const npv = (r: number) => amounts.reduce((s, a, i) => s + a / Math.pow(1 + r, years[i]), 0);
  const dNpv = (r: number) => amounts.reduce((s, a, i) => s - (years[i] * a) / Math.pow(1 + r, years[i] + 1), 0);

  // Newton-Raphson depuis 10 %
  let r = 0.1;
  for (let k = 0; k < 60; k++) {
    const f = npv(r);
    if (Math.abs(f) < 1e-7) return r;
    const d = dNpv(r);
    if (d === 0 || !Number.isFinite(d)) break;
    let next = r - f / d;
    if (next <= -0.9999) next = (r - 0.9999) / 2; // rester dans le domaine (1 + r) > 0
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - r) < 1e-9) return next;
    r = next;
  }

  // Repli : dichotomie sur [-0,9999 ; 10] si un changement de signe existe
  let lo = -0.9999;
  let hi = 10;
  let fLo = npv(lo);
  let fHi = npv(hi);
  if (!Number.isFinite(fLo) || !Number.isFinite(fHi) || fLo * fHi > 0) return null;
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7 || (hi - lo) / 2 < 1e-9) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

export type AssetPerformanceInput = {
  transactions: { type: string; amount: number; date: Date }[];
  position: PositionState;
  lastPrice: number | null;
  now?: Date;
};

export type AssetPerformanceResult = {
  tri: number | null; // TRI annualisé (0,083 = 8,3 %/an) ou null si non calculable
  triFiable: boolean; // false si moins de ~3 mois d'historique (annualisation trompeuse)
  rendementTotalSimple: number | null; // rendement cumulé non annualisé (0,15 = +15 %)
  totalAchats: number;
  totalVentes: number;
  totalDividendes: number;
  valeurActuelle: number;
  plusValueLatente: number;
  ancienneteAnnees: number;
  premierAchat: Date | null;
};

// toutes les métriques de perf d'un titre (TRI, rendement, totaux) depuis ses transactions signées (BUY négatif, SELL/DIVIDEND positifs)
export function computeAssetPerformance(input: AssetPerformanceInput): AssetPerformanceResult {
  const now = input.now ?? new Date();
  const { transactions, position, lastPrice } = input;

  let totalAchats = 0;
  let totalVentes = 0;
  let totalDividendes = 0;
  let premierAchat: Date | null = null;

  // Additionne les achats, ventes et dividendes, et repère la date du 1er achat
  for (const t of transactions) {
    if (t.type === "BUY") {
      totalAchats += Math.abs(t.amount);
      if (!premierAchat || t.date < premierAchat) premierAchat = t.date;
    } else if (t.type === "SELL") {
      totalVentes += t.amount;
    } else if (t.type === "DIVIDEND") {
      totalDividendes += t.amount;
    }
  }

  const valeurActuelle = computeValeurActuelle(position, lastPrice);
  const plusValueLatente = computePlusValueLatente(valeurActuelle, computeMontantInvesti(position));
  const ancienneteAnnees = premierAchat ? anciennetePortefeuille(premierAchat, now) : 0;

  // flux TRI = transactions + valeur de revente aujourd'hui ; sans cours connu, non calculable
  let tri: number | null = null;
  if (lastPrice !== null) {
    const flows: CashFlow[] = transactions.map((t) => ({ date: t.date, amount: t.amount }));
    if (valeurActuelle !== 0) flows.push({ date: now, amount: valeurActuelle });
    tri = computeXirr(flows);
  }

  const rendementTotalSimple =
    totalAchats > 0 ? (valeurActuelle + totalVentes + totalDividendes - totalAchats) / totalAchats : null;

  return {
    tri,
    triFiable: ancienneteAnnees >= 0.25,
    rendementTotalSimple,
    totalAchats,
    totalVentes,
    totalDividendes,
    valeurActuelle,
    plusValueLatente,
    ancienneteAnnees,
    premierAchat,
  };
}
