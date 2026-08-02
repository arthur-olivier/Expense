// types partagés page Bourse / composants client, dérivés des server actions (actions/portfolio/*)
// dérivés des modèles Prisma via Pick pour suivre le schéma ; dates = objets Date (Next.js (dé)sérialise)

import type {
  Asset as PrismaAsset,
  Position as PrismaPosition,
  Broker as PrismaBroker,
  Portfolio as PrismaPortfolio,
  PortfolioTransaction as PrismaPortfolioTransaction,
  BrokerCashTransaction as PrismaBrokerCashTransaction,
} from "../app/generated/prisma/client";

export type Asset = Pick<
  PrismaAsset,
  "id" | "name" | "isin" | "ticker" | "currency" | "lastPrice" | "lastPriceAt" | "autoUpdate"
>;

export type Position = Pick<PrismaPosition, "id" | "assetId" | "quantity" | "pru"> & {
  asset: Asset;
};

// un courtier (ex "Trade Republic") : porte le cash partagé par les portefeuilles sans liquidité propre (voir Portfolio.hasOwnCash)
export type Broker = Pick<PrismaBroker, "id" | "name" | "cashBalance">;

export type Portfolio = Pick<
  PrismaPortfolio,
  "id" | "name" | "type" | "hasOwnCash" | "brokerId" | "openedAt" | "cashBalance"
> & {
  // si hasOwnCash=false, pas de cash propre : ses achats/ventes touchent le courtier lié plutôt que son solde
  broker: Broker | null;
  positions: Position[];
};

export type MovementType = "BUY" | "SELL" | "DEPOSIT" | "WITHDRAWAL" | "DIVIDEND";

// métriques de perf d'un titre, calculées à la demande au dépliage (voir getAssetPerformance / computeAssetPerformance)
// non dérivé de Prisma, valeurs calculées
export type AssetPerformance = {
  // TRI annualisé (0.083 = 8,3 %/an) ou null si non calculable (cours manquant, etc.)
  tri: number | null;
  // false si < ~3 mois d'historique : TRI annualisé pas fiable
  triFiable: boolean;
  // rendement cumulé non annualisé (0.15 = +15 %) ou null si aucun achat
  rendementTotalSimple: number | null;
  totalAchats: number;
  totalVentes: number;
  totalDividendes: number;
  valeurActuelle: number;
  plusValueLatente: number;
  ancienneteAnnees: number;
  premierAchat: Date | null;
};

export type PortfolioTransactionRow = Pick<
  PrismaPortfolioTransaction,
  "id" | "assetId" | "type" | "quantity" | "price" | "amount" | "fees" | "date" | "counterpartyLabel"
> & {
  asset: { name: string } | null;
};

export type BrokerTransactionRow = Pick<
  PrismaBrokerCashTransaction,
  "id" | "type" | "amount" | "balanceAfter" | "date" | "portfolioTransactionId" | "counterpartyLabel"
> & {
  portfolio: { name: string } | null;
  // nom de l'actif de la transaction déléguée (achat/vente/dividende), pour afficher ex "Dividende Nvidia" au lieu du seul nom du portefeuille
  portfolioTransaction: { asset: { name: string } | null } | null;
};
