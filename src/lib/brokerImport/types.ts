//-------- socle commun aux imports courtiers : types, détection de virements internes, regroupement en portefeuilles ------

export type BrokerRow = {
  transactionId: string;
  date: Date;
  accountId: string;
  category: string;
  type: string;
  assetClass: string;
  name: string;
  symbol: string;
  shares: number | null;
  price: number | null;
  amount: number | null;
  fee: number | null;
  tax: number | null;
  currency: string;
  description: string;
  // marqué si la ligne fait partie d'une paire de virement interne
  internalTransfer?: "IN" | "OUT";
  // groupe du compte en face (pour un libellé type "Transfert interne vers PEA")
  internalTransferCounterpartyGroup?: string;
};

// Une ligne d'import traduite en mouvement métier
export type MappedMovement =
  | { kind: "BUY"; quantity: number; price: number; fees: number }
  | { kind: "SELL"; quantity: number; price: number; fees: number }
  | { kind: "DEPOSIT"; amount: number }
  | { kind: "WITHDRAWAL"; amount: number }
  | { kind: "DIVIDEND"; amount: number }
  // Virement entre deux comptes d'un même import ; amount est déjà signé (+ entrée, - sortie)
  | { kind: "INTERNAL_TRANSFER"; amount: number }
  | { kind: "SKIPPED"; reason: string };

// Résumé d'un compte détecté dans le fichier importé (proposé à l'utilisateur)
export type ImportAccountSummary = {
  accountId: string;
  label: string;
  suggestedType: string;
  suggestedHasOwnCash: boolean;
  count: number;
  earliestDate: Date;
};

// Contrat que chaque courtier (Trade Republic, etc.) doit implémenter pour être importable
export interface BrokerImportProvider {
  id: string;
  label: string;
  parseFile(buffer: Buffer): BrokerRow[];
  mapRowToMovement(row: BrokerRow): MappedMovement;
  // Clé de regroupement en portefeuille (un compte source peut couvrir plusieurs portefeuilles)
  getPortfolioGroupKey(row: BrokerRow): string;
  suggestPortfolioLabel(groupKey: string): string;
  suggestPortfolioType(groupKey: string): string;
  suggestHasOwnCash(groupKey: string): boolean;
}

// Flux de trésorerie net d'une ligne (montant + frais + taxes)
export function cashFlow(row: BrokerRow): number {
  return (row.amount ?? 0) + (row.fee ?? 0) + (row.tax ?? 0);
}

// détecte les paires de virements entre deux comptes d'un même import et les marque "transfert interne"
// n'apparie que si non ambigu : un seul candidat, même montant, même jour, autre groupe
export function linkInternalTransfers(
  rows: BrokerRow[],
  getGroupKey: (row: BrokerRow) => string,
  depositTypes: Set<string>,
  withdrawalTypes: Set<string>,
): void {
  const dayOf = (row: BrokerRow) => row.date.toISOString().slice(0, 10);

  // Sorties de cash (montant négatif) et entrées de cash (montant positif)
  const outs = rows
    .filter((r) => r.category === "CASH" && withdrawalTypes.has(r.type) && cashFlow(r) < 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const ins = rows.filter((r) => r.category === "CASH" && depositTypes.has(r.type) && cashFlow(r) > 0);
  const usedIns = new Set<BrokerRow>();

  // Pour chaque sortie, cherche l'entrée correspondante (même jour, même montant, autre groupe)
  for (const out of outs) {
    const outGroup = getGroupKey(out);
    const day = dayOf(out);
    const candidates = ins.filter(
      (r) =>
        !usedIns.has(r) &&
        getGroupKey(r) !== outGroup &&
        dayOf(r) === day &&
        Math.abs(Math.abs(cashFlow(r)) - Math.abs(cashFlow(out))) < 0.01,
    );
    if (candidates.length !== 1) continue; // ambigu ou introuvable : on laisse en dépôt/retrait normal
    const match = candidates[0];
    usedIns.add(match);
    out.internalTransfer = "OUT";
    out.internalTransferCounterpartyGroup = getGroupKey(match);
    match.internalTransfer = "IN";
    match.internalTransferCounterpartyGroup = outGroup;
  }
}

// Regroupe les lignes par portefeuille et renvoie un résumé de chaque compte détecté
export function listAccounts(rows: BrokerRow[], provider: BrokerImportProvider): ImportAccountSummary[] {
  const map = new Map<string, { count: number; earliestDate: Date }>();
  for (const r of rows) {
    const key = provider.getPortfolioGroupKey(r);
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      if (r.date < existing.earliestDate) existing.earliestDate = r.date;
    } else {
      map.set(key, { count: 1, earliestDate: r.date });
    }
  }
  return [...map.entries()].map(([groupKey, v]) => ({
    accountId: groupKey,
    label: provider.suggestPortfolioLabel(groupKey),
    suggestedType: provider.suggestPortfolioType(groupKey),
    suggestedHasOwnCash: provider.suggestHasOwnCash(groupKey),
    count: v.count,
    earliestDate: v.earliestDate,
  }));
}
