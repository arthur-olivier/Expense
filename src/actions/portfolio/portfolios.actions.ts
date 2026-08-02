"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { computeAssetPerformance } from "@/lib/calculations/portfolio-calculations";
import type { AssetPerformance } from "@/types/portfolio";

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

// crée un portefeuille ; exige un courtier si pas de cash propre
export async function createPortfolio({
  name,
  type,
  hasOwnCash,
  brokerId,
  openedAt,
}: {
  name: string;
  type: string;
  hasOwnCash: boolean;
  brokerId?: string;
  openedAt: Date;
}) {
  const user = await getAuthenticatedUser();
  if (!hasOwnCash && !brokerId) {
    throw new Error("Un portefeuille sans cash propre doit être associé à un courtier.");
  }
  if (brokerId) {
    const broker = await prisma.broker.findFirst({ where: { id: brokerId, userId: user.id } });
    if (!broker) throw new Error("Courtier introuvable");
  }
  return prisma.portfolio.create({
    data: { userId: user.id, name, type, hasOwnCash, brokerId, openedAt, cashBalance: 0 },
  });
}

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

// change la date d'ouverture (base de l'ancienneté fiscale, seuil 5 ans PEA, voir getTauxImposition)
// bornes (pas futur, pas après le 1er mouvement) gérées côté UI via getPortfolioOpenedAtMax, pas revalidées ici
export async function updatePortfolioOpenedAt(portfolioId: string, openedAt: Date) {
  const user = await getAuthenticatedUser();
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
  });
  if (!portfolio) throw new Error("Portefeuille introuvable");

  return prisma.portfolio.update({
    where: { id: portfolioId },
    data: { openedAt },
  });
}

// ─────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────

// portefeuilles de l'utilisateur avec positions, actifs et courtier
export async function getPortfolios() {
  const user = await getAuthenticatedUser();
  return prisma.portfolio.findMany({
    where: { userId: user.id },
    include: { positions: { include: { asset: true } }, broker: true },
    orderBy: { createdAt: "asc" },
  });
}

// un portefeuille avec positions + courtier, lève si introuvable
export async function getPortfolio(id: string) {
  const user = await getAuthenticatedUser();
  const portfolio = await prisma.portfolio.findFirst({
    where: { id, userId: user.id },
    include: { positions: { include: { asset: true } }, broker: true },
  });
  if (!portfolio) throw new Error("Portefeuille introuvable");
  return portfolio;
}

// historique des transactions d'un portefeuille, du plus récent au plus ancien
export async function getPortfolioTransactions(portfolioId: string) {
  const user = await getAuthenticatedUser();
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
  });
  if (!portfolio) throw new Error("Portefeuille introuvable");
  return prisma.portfolioTransaction.findMany({
    where: { portfolioId },
    include: { asset: true },
    orderBy: { date: "desc" },
  });
}

// métriques de perf d'un titre à la demande (TRI, rendement, investi, +/- value...)
// appelé au dépliage de la ligne, voir computeAssetPerformance
export async function getAssetPerformance(portfolioId: string, assetId: string): Promise<AssetPerformance> {
  const user = await getAuthenticatedUser();
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
  });
  if (!portfolio) throw new Error("Portefeuille introuvable");

  const [asset, position, transactions] = await Promise.all([
    prisma.asset.findFirst({ where: { id: assetId, userId: user.id } }),
    prisma.position.findUnique({
      where: { portfolioId_assetId: { portfolioId, assetId } },
    }),
    prisma.portfolioTransaction.findMany({
      where: { portfolioId, assetId, type: { in: ["BUY", "SELL", "DIVIDEND"] } },
      select: { type: true, amount: true, date: true },
    }),
  ]);
  if (!asset) throw new Error("Titre introuvable");

  return computeAssetPerformance({
    transactions,
    position: { quantity: position?.quantity ?? 0, pru: position?.pru ?? 0 },
    lastPrice: asset.lastPrice,
  });
}

// borne max pour la date d'ouverture : le plus tôt entre aujourd'hui et le 1er mouvement
// (pas dans le futur ni après une opération existante) ; utilisé par le DatePicker de EditPortfolioDialog
export async function getPortfolioOpenedAtMax(portfolioId: string): Promise<Date> {
  const user = await getAuthenticatedUser();
  const portfolio = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId: user.id },
    select: { id: true },
  });
  if (!portfolio) throw new Error("Portefeuille introuvable");

  const firstTransaction = await prisma.portfolioTransaction.findFirst({
    where: { portfolioId },
    orderBy: { date: "asc" },
    select: { date: true },
  });

  const now = new Date();
  if (firstTransaction && firstTransaction.date.getTime() < now.getTime()) {
    return firstTransaction.date;
  }
  return now;
}
