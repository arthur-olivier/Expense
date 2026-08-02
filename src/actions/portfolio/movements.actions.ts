"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { assertAmount } from "@/lib/validation";
import { ok, ko, fail } from "@/lib/actionResult";
import { computeBuyAmount, computeSellAmount } from "@/lib/calculations/portfolio-calculations";
import { updateAssetPrice } from "@/actions/portfolio/assets.actions";
import {
  recalcPosition,
  recalcBrokerBalance,
  recalcPortfolioCashBalance,
  getOwnedPortfolioAndAsset,
  getCashHolderBalance,
  applyAutoDeposit,
  applyCashEffect,
} from "./shared";

// ─────────────────────────────────────────────────────────────
// CREATE : mouvements (achat, vente, dépôt, retrait, dividende)
// ─────────────────────────────────────────────────────────────

// achat : vérifie le cash dispo, propose un dépôt auto si insuffisant
//option pour mettre a jour le cours de l'action
export async function addBuyTransaction({
  portfolioId,
  assetId,
  quantity,
  price,
  fees,
  date,
  confirmAutoDeposit = false,
  updatePrice = false, //met a jour le cours actuel de l action
}: {
  portfolioId: string;
  assetId: string;
  quantity: number;
  price: number;
  fees: number;
  date: Date;
  confirmAutoDeposit?: boolean;
  updatePrice?: boolean;
}) {
  try {
    const user = await getAuthenticatedUser();
    quantity = assertAmount(quantity);
    price = assertAmount(price);
    fees = assertAmount(fees, { allowZero: true });
    const { portfolio } = await getOwnedPortfolioAndAsset(portfolioId, assetId, user.id);

    const cost = quantity * price + fees;
    const holderBalance = await getCashHolderBalance(portfolio);
    const shortfall = cost - holderBalance;

    if (shortfall > 1e-6 && !confirmAutoDeposit) {
      return ko(`Cash insuffisant : il manque ${shortfall.toFixed(2)} €. Confirme le dépôt automatique pour continuer.`);
    }

    const amount = computeBuyAmount(quantity, price, fees);

    await prisma.$transaction(async (tx) => {
      if (shortfall > 1e-6) {
        await applyAutoDeposit(tx, portfolio, shortfall, date);
      }
      const created = await tx.portfolioTransaction.create({
        data: { portfolioId, assetId, type: "BUY", quantity, price, fees, amount, date },
      });
      await applyCashEffect(tx, portfolio, "BUY", amount, date, created.id);
      await recalcPosition(tx, portfolioId, assetId);

      // maj du cours avec le prix d'achat si demandé, dans la même transaction (tout ou rien)
      if (updatePrice) {
        await updateAssetPrice(assetId, price);
      }
    });
    return ok("Mouvement enregistré");
  } catch (err) {
    return fail("addBuyTransaction", err, "Opération impossible.");
  }
}

// vente : vérifie que la quantité détenue suffit
export async function addSellTransaction({
  portfolioId,
  assetId,
  quantity,
  price,
  fees,
  date,
}: {
  portfolioId: string;
  assetId: string;
  quantity: number;
  price: number;
  fees: number;
  date: Date;
}) {
  try {
    const user = await getAuthenticatedUser();
    quantity = assertAmount(quantity);
    price = assertAmount(price);
    fees = assertAmount(fees, { allowZero: true });
    const { portfolio } = await getOwnedPortfolioAndAsset(portfolioId, assetId, user.id);

    const position = await prisma.position.findUnique({
      where: { portfolioId_assetId: { portfolioId, assetId } },
    });
    if (!position || position.quantity < quantity - 1e-6) return ko("Quantité insuffisante dans le portefeuille.");

    const amount = computeSellAmount(quantity, price, fees);

    await prisma.$transaction(async (tx) => {
      const created = await tx.portfolioTransaction.create({
        data: { portfolioId, assetId, type: "SELL", quantity, price, fees, amount, date },
      });
      await applyCashEffect(tx, portfolio, "SELL", amount, date, created.id);
      await recalcPosition(tx, portfolioId, assetId);
    });
    return ok("Mouvement enregistré");
  } catch (err) {
    return fail("addSellTransaction", err, "Opération impossible.");
  }
}

// dépôt cash sur un portefeuille qui gère son propre solde
export async function addDepositTransaction({ portfolioId, amount, date }: { portfolioId: string; amount: number; date: Date }) {
  try {
    const user = await getAuthenticatedUser();
    amount = assertAmount(amount);
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId: user.id },
    });
    if (!portfolio) return ko("Portefeuille introuvable.");
    if (!portfolio.hasOwnCash) {
      return ko("Ce portefeuille n'a pas son propre cash — dépose plutôt sur le courtier associé.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.portfolioTransaction.create({
        data: { portfolioId, type: "DEPOSIT", amount, fees: 0, date },
      });
      await tx.portfolio.update({
        where: { id: portfolioId },
        data: { cashBalance: { increment: amount } },
      });
    });
    return ok("Mouvement enregistré");
  } catch (err) {
    return fail("addDepositTransaction", err, "Opération impossible.");
  }
}

// retrait cash sur un portefeuille à cash propre, après vérif du solde
export async function addWithdrawalTransaction({
  portfolioId,
  amount,
  date,
}: {
  portfolioId: string;
  amount: number;
  date: Date;
}) {
  try {
    const user = await getAuthenticatedUser();
    amount = assertAmount(amount);
    const portfolio = await prisma.portfolio.findFirst({
      where: { id: portfolioId, userId: user.id },
    });
    if (!portfolio) return ko("Portefeuille introuvable.");
    if (!portfolio.hasOwnCash) {
      return ko("Ce portefeuille n'a pas son propre cash — retire plutôt depuis le courtier associé.");
    }
    if (portfolio.cashBalance < amount) return ko("Solde en cash insuffisant.");

    await prisma.$transaction(async (tx) => {
      await tx.portfolioTransaction.create({
        data: { portfolioId, type: "WITHDRAWAL", amount: -amount, fees: 0, date },
      });
      await tx.portfolio.update({
        where: { id: portfolioId },
        data: { cashBalance: { decrement: amount } },
      });
    });
    return ok("Mouvement enregistré");
  } catch (err) {
    return fail("addWithdrawalTransaction", err, "Opération impossible.");
  }
}

// dividende reçu sur un actif : crédite le cash du portefeuille ou du courtier
export async function addDividendTransaction({
  portfolioId,
  assetId,
  amount,
  date,
}: {
  portfolioId: string;
  assetId: string;
  amount: number;
  date: Date;
}) {
  try {
    const user = await getAuthenticatedUser();
    amount = assertAmount(amount);
    const { portfolio } = await getOwnedPortfolioAndAsset(portfolioId, assetId, user.id);

    await prisma.$transaction(async (tx) => {
      const created = await tx.portfolioTransaction.create({
        data: { portfolioId, assetId, type: "DIVIDEND", amount, fees: 0, date },
      });
      await applyCashEffect(tx, portfolio, "DIVIDEND", amount, date, created.id);
    });
    return ok("Mouvement enregistré");
  } catch (err) {
    return fail("addDividendTransaction", err, "Opération impossible.");
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────

// supprime une transaction, annule son effet cash, recalcule la position si achat/vente
export async function deleteTransaction(transactionId: string) {
  try {
    const user = await getAuthenticatedUser();
    const transaction = await prisma.portfolioTransaction.findFirst({
      where: { id: transactionId },
      include: { portfolio: { include: { broker: true } } },
    });
    if (!transaction || transaction.portfolio.userId !== user.id) return ko("Mouvement introuvable.");

    const portfolio = transaction.portfolio;
    const holderBalance = portfolio.hasOwnCash ? portfolio.cashBalance : (portfolio.broker?.cashBalance ?? 0);

    if (holderBalance - transaction.amount < -1e-6) {
      return ko("Impossible de supprimer ce mouvement : le cash deviendrait négatif.");
    }

    await prisma.$transaction(async (tx) => {
      if (portfolio.hasOwnCash) {
        await tx.portfolioTransaction.delete({ where: { id: transactionId } });
        // redérive le solde depuis les transactions restantes plutôt que décrémenter à l'aveugle (voir recalcPortfolioCashBalance)
        await recalcPortfolioCashBalance(tx, transaction.portfolioId);
      } else if (portfolio.brokerId) {
        await tx.brokerCashTransaction.deleteMany({
          where: { portfolioTransactionId: transactionId },
        });
        await tx.portfolioTransaction.delete({ where: { id: transactionId } });
        // redérive solde + balanceAfter du courtier (sinon supprimer une ligne au milieu décale le solde courant des suivantes)
        await recalcBrokerBalance(tx, portfolio.brokerId);
      } else {
        await tx.portfolioTransaction.delete({ where: { id: transactionId } });
      }
      if (transaction.assetId && (transaction.type === "BUY" || transaction.type === "SELL")) {
        await recalcPosition(tx, transaction.portfolioId, transaction.assetId);
      }
    });
    return ok("Mouvement supprimé");
  } catch (err) {
    return fail("deleteTransaction", err, "Suppression impossible.");
  }
}
