"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { assertAmount } from "@/lib/validation";
import { UserError, guardAction, ok, ko, fail } from "@/lib/actionResult";
import { recalcBrokerBalance } from "./shared";

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

// crée un courtier, cash initial à zéro
export async function createBroker({ name }: { name: string }) {
  try {
    const user = await getAuthenticatedUser();
    const broker = await prisma.broker.create({ data: { userId: user.id, name, cashBalance: 0 } });
    return ok("Courtier créé", broker);
  } catch (err) {
    return fail("createBroker", err, "Impossible de créer le courtier.");
  }
}

// ─────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────

// courtiers de l'utilisateur, triés par date de création
export async function getBrokers() {
  return guardAction("getBrokers", async () => {
    const user = await getAuthenticatedUser();
    return prisma.broker.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  });
}

// historique cash d'un courtier, avec le nom du portefeuille lié si besoin
export async function getBrokerTransactions(brokerId: string) {
  return guardAction("getBrokerTransactions", async () => {
    const user = await getAuthenticatedUser();
    const broker = await prisma.broker.findFirst({ where: { id: brokerId, userId: user.id } });
    if (!broker) throw new UserError("Courtier introuvable");
    return prisma.brokerCashTransaction.findMany({
      where: { brokerId },
      include: {
        portfolio: { select: { name: true } },
        portfolioTransaction: { select: { asset: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    });
  });
}

// ─────────────────────────────────────────────────────────────
// Mouvements cash (dépôts, retraits, suppression)
// ─────────────────────────────────────────────────────────────

// dépôt sur le cash du courtier + maj du solde
export async function addBrokerDeposit({
  brokerId,
  amount,
  date,
}: {
  brokerId: string;
  amount: number;
  date: Date;
}) {
  try {
    const user = await getAuthenticatedUser();
    amount = assertAmount(amount);
    const broker = await prisma.broker.findFirst({ where: { id: brokerId, userId: user.id } });
    if (!broker) return ko("Courtier introuvable.");

    await prisma.$transaction(async (tx) => {
      const current = await tx.broker.findUniqueOrThrow({ where: { id: brokerId } });
      await tx.brokerCashTransaction.create({
        data: { brokerId, type: "DEPOSIT", amount, balanceAfter: current.cashBalance + amount, date },
      });
      await tx.broker.update({
        where: { id: brokerId },
        data: { cashBalance: { increment: amount } },
      });
    });
    return ok("Mouvement enregistré");
  } catch (err) {
    return fail("addBrokerDeposit", err, "Opération impossible.");
  }
}

// retrait du cash courtier après vérif du solde
export async function addBrokerWithdrawal({
  brokerId,
  amount,
  date,
}: {
  brokerId: string;
  amount: number;
  date: Date;
}) {
  try {
    const user = await getAuthenticatedUser();
    amount = assertAmount(amount);
    const broker = await prisma.broker.findFirst({ where: { id: brokerId, userId: user.id } });
    if (!broker) return ko("Courtier introuvable.");
    if (broker.cashBalance < amount) return ko("Solde en cash insuffisant.");

    await prisma.$transaction(async (tx) => {
      const current = await tx.broker.findUniqueOrThrow({ where: { id: brokerId } });
      await tx.brokerCashTransaction.create({
        data: {
          brokerId,
          type: "WITHDRAWAL",
          amount: -amount,
          balanceAfter: current.cashBalance - amount,
          date,
        },
      });
      await tx.broker.update({
        where: { id: brokerId },
        data: { cashBalance: { decrement: amount } },
      });
    });
    return ok("Mouvement enregistré");
  } catch (err) {
    return fail("addBrokerWithdrawal", err, "Opération impossible.");
  }
}

// supprime un mouvement cash manuel et ajuste le solde
// un mouvement lié à un achat/vente (portfolioTransactionId non nul) se supprime depuis son portefeuille
export async function deleteBrokerCashTransaction(id: string) {
  try {
    const user = await getAuthenticatedUser();
    const transaction = await prisma.brokerCashTransaction.findFirst({
      where: { id },
      include: { broker: true },
    });
    if (!transaction || transaction.broker.userId !== user.id) return ko("Mouvement introuvable.");
    if (transaction.portfolioTransactionId) {
      return ko("Ce mouvement provient d'un achat/vente : supprime-le depuis le portefeuille concerné.");
    }
    if (transaction.broker.cashBalance - transaction.amount < -1e-6) {
      return ko("Impossible de supprimer ce mouvement : le cash du courtier deviendrait négatif.");
    }

    await prisma.$transaction(async (tx) => {
      await tx.brokerCashTransaction.delete({ where: { id } });
      // redérive le solde et la chaîne balanceAfter depuis les transactions restantes
      // (sinon supprimer une ligne au milieu décale le solde courant des suivantes)
      await recalcBrokerBalance(tx, transaction.brokerId);
    });
    return ok("Mouvement supprimé");
  } catch (err) {
    return fail("deleteBrokerCashTransaction", err, "Suppression impossible.");
  }
}
