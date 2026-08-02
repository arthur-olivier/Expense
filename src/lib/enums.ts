// Catégories de dépenses possibles (stockées en base sous forme de nombre 0-6)
export enum CategoryDepense {
  Logement = 0,
  Transport = 1,
  Alimentation = 2,
  Sante = 3,
  Loisirs = 4,
  Abonnements = 5,
  Autre = 6,
}

// Type d'une opération : une vraie dépense ou un virement sortant
export enum TypeDepense {
  Expense = 0,
  TransferOut = 1,
}

// Nom affiché à l'écran pour chaque catégorie de dépense
export const CategoryLabels: Record<number, string> = {
  [CategoryDepense.Logement]: "Logement",
  [CategoryDepense.Transport]: "Transport",
  [CategoryDepense.Alimentation]: "Alimentation",
  [CategoryDepense.Sante]: "Santé",
  [CategoryDepense.Loisirs]: "Loisirs",
  [CategoryDepense.Abonnements]: "Abonnements",
  [CategoryDepense.Autre]: "Autre",
};

// Couleur associée à chaque catégorie (pour les graphiques)
export const CategoryColors: Record<number, string> = {
  [CategoryDepense.Logement]: "#6366f1",
  [CategoryDepense.Transport]: "#f59e0b",
  [CategoryDepense.Alimentation]: "#10b981",
  [CategoryDepense.Sante]: "#3b82f6",
  [CategoryDepense.Loisirs]: "#ec4899",
  [CategoryDepense.Abonnements]: "#8b5cf6",
  [CategoryDepense.Autre]: "#94a3b8",
};

// Nom affiché pour chaque type d'opération
export const TypeLabels: Record<number, string> = {
  [TypeDepense.Expense]: "Dépense",
  [TypeDepense.TransferOut]: "Virement",
};

// Nom affiché pour chaque type d'enveloppe d'investissement
export const PortfolioTypeLabels: Record<string, string> = {
  PEA: "PEA",
  CTO: "CTO",
  PER: "PER",
  AV: "Assurance-vie",
  CRYPTO: "Crypto",
};

// Nom affiché pour chaque type de transaction dans un portefeuille
export const PortfolioTransactionTypeLabels: Record<string, string> = {
  BUY: "Achat",
  SELL: "Vente",
  DEPOSIT: "Dépôt",
  WITHDRAWAL: "Retrait",
  DIVIDEND: "Dividende",
  FEE: "Frais",
  INTERNAL_TRANSFER: "Transfert interne",
  DEPOSIT_ADJUSTMENT: "Dépôt (régularisation import)",
};

// Noms des mois en français (index 0 = Janvier), pour l'affichage des dates
export const MONTH_NAMES = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];
