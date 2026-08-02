import { prisma } from "@/lib/prisma";
import { recomputePosition } from "@/lib/calculations/portfolio-calculations";
import type { Prisma } from "@/app/generated/prisma/client";
import type { BrokerRow } from "@/lib/brokerImport/types";

// vue minimale d'un portefeuille pour savoir où va le cash
// cashBalance ne compte que si hasOwnCash, sinon le cash vit sur le Broker
export type CashHolder = {
  id: string;
  hasOwnCash: boolean;
  cashBalance: number;
  brokerId: string | null;
};

// recalcule la position (quantité + PRU) en rejouant tout l'historique achats/ventes
// plus lent qu'un incrément mais le cache Position ne dérive jamais
export async function recalcPosition(
  tx: Prisma.TransactionClient,
  portfolioId: string,
  assetId: string,
) {
  const transactions = await tx.portfolioTransaction.findMany({
    where: { portfolioId, assetId, type: { in: ["BUY", "SELL"] } },
    orderBy: { date: "asc" },
  });

  const state = recomputePosition(
    transactions.map((t) => ({
      type: t.type,
      quantity: t.quantity,
      price: t.price,
      fees: t.fees,
      date: t.date,
    })),
  );

  await tx.position.upsert({
    where: { portfolioId_assetId: { portfolioId, assetId } },
    update: { quantity: state.quantity, pru: state.pru },
    create: { portfolioId, assetId, quantity: state.quantity, pru: state.pru },
  });
}

// charge portefeuille + actif en vérifiant qu'ils sont à l'utilisateur
export async function getOwnedPortfolioAndAsset(
  portfolioId: string,
  assetId: string,
  userId: string,
) {
  const portfolio = await prisma.portfolio.findFirst({ where: { id: portfolioId, userId } });
  if (!portfolio) throw new Error("Portefeuille introuvable");
  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId } });
  if (!asset) throw new Error("Titre introuvable");
  return { portfolio, asset };
}

// solde cash du bon détenteur : le portefeuille, ou son courtier si cash délégué
export async function getCashHolderBalance(portfolio: CashHolder): Promise<number> {
  if (portfolio.hasOwnCash) return portfolio.cashBalance;
  if (!portfolio.brokerId)
    throw new Error("Ce portefeuille n'a pas de courtier associé pour son cash.");
  const broker = await prisma.broker.findUniqueOrThrow({ where: { id: portfolio.brokerId } });
  return broker.cashBalance;
}

// dépôt auto (portefeuille ou courtier) pour combler un manque de cash avant achat
// l'appelant doit l'avoir fait confirmer à l'utilisateur avant
export async function applyAutoDeposit(
  tx: Prisma.TransactionClient,
  portfolio: CashHolder,
  shortfall: number,
  date: Date,
) {
  if (portfolio.hasOwnCash) {
    await tx.portfolioTransaction.create({
      data: { portfolioId: portfolio.id, type: "DEPOSIT", amount: shortfall, fees: 0, date },
    });
    await tx.portfolio.update({
      where: { id: portfolio.id },
      data: { cashBalance: { increment: shortfall } },
    });
  } else {
    const currentBroker = await tx.broker.findUniqueOrThrow({ where: { id: portfolio.brokerId! } });
    await tx.brokerCashTransaction.create({
      data: {
        brokerId: portfolio.brokerId!,
        type: "DEPOSIT",
        amount: shortfall,
        balanceAfter: currentBroker.cashBalance + shortfall,
        date,
      },
    });
    await tx.broker.update({
      where: { id: portfolio.brokerId! },
      data: { cashBalance: { increment: shortfall } },
    });
  }
}

// recalcule le cash d'un courtier depuis la somme des mouvements et reconstruit balanceAfter
// on redérive depuis les transactions plutôt que de croire un compteur incrémenté
export async function recalcBrokerBalance(tx: Prisma.TransactionClient, brokerId: string) {
  const transactions = await tx.brokerCashTransaction.findMany({
    where: { brokerId },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  let running = 0;
  for (const t of transactions) {
    running += t.amount;
    if (Math.abs(running - t.balanceAfter) > 1e-9) {
      await tx.brokerCashTransaction.update({
        where: { id: t.id },
        data: { balanceAfter: running },
      });
    }
  }

  await tx.broker.update({ where: { id: brokerId }, data: { cashBalance: running } });
  return running;
}

// recalcule le cash d'un portefeuille hasOwnCash = somme des amount de ses transactions
// à n'appeler que sur un hasOwnCash, sinon le cash vit sur le courtier
export async function recalcPortfolioCashBalance(
  tx: Prisma.TransactionClient,
  portfolioId: string,
) {
  const agg = await tx.portfolioTransaction.aggregate({
    where: { portfolioId },
    _sum: { amount: true },
  });
  const balance = agg._sum.amount ?? 0;
  await tx.portfolio.update({ where: { id: portfolioId }, data: { cashBalance: balance } });
  return balance;
}

// répercute l'effet cash d'un mouvement sur le bon détenteur (portefeuille ou courtier si délégué)
// le portefeuille garde sa PortfolioTransaction ; seul le mouvement d'argent va sur le courtier
export async function applyCashEffect(
  tx: Prisma.TransactionClient,
  portfolio: CashHolder,
  type: string,
  amount: number,
  date: Date,
  portfolioTransactionId: string,
) {
  if (portfolio.hasOwnCash) {
    await tx.portfolio.update({
      where: { id: portfolio.id },
      data: { cashBalance: { increment: amount } },
    });
  } else {
    const currentBroker = await tx.broker.findUniqueOrThrow({ where: { id: portfolio.brokerId! } });
    await tx.brokerCashTransaction.create({
      data: {
        brokerId: portfolio.brokerId!,
        portfolioId: portfolio.id,
        portfolioTransactionId,
        type,
        amount,
        balanceAfter: currentBroker.cashBalance + amount,
        date,
      },
    });
    await tx.broker.update({
      where: { id: portfolio.brokerId! },
      data: { cashBalance: { increment: amount } },
    });
  }
}

// retrouve un Asset par ticker ou en crée un à la volée pendant l'import
// on préfère le prix résolu (dérivé du montant débité) au prix brut de la ligne
export async function findOrCreateAssetForImport(
  tx: Prisma.TransactionClient,
  userId: string,
  row: BrokerRow,
  resolvedPrice: number | null,
) {
  const ticker = row.symbol || null;
  const price = resolvedPrice ?? row.price;

  if (ticker) {
    const existing = await tx.asset.findFirst({ where: { userId, ticker } });
    if (existing) {
      if (price !== null && (!existing.lastPriceAt || existing.lastPriceAt < row.date)) {
        await tx.asset.update({
          where: { id: existing.id },
          data: { lastPrice: price, lastPriceAt: row.date },
        });
      }
      return existing.id;
    }
  }

  const created = await tx.asset.create({
    data: {
      userId,
      name: row.name || row.symbol || "Titre importé",
      ticker,
      currency: row.currency,
      autoUpdate: false,
      lastPrice: price,
      lastPriceAt: price !== null ? row.date : null,
    },
  });
  return created.id;
}
