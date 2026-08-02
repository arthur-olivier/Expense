"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { assertAmount } from "@/lib/validation";
import { fail, type ActionResult } from "@/lib/actionResult";
import { generateInvestmentTransactions } from "@/lib/processRecurringInvestments";
import type { Investment } from "@/types/finance";

// vérifie que le compte est à l'utilisateur et que la poche dépend de ce compte
// sinon un appel forgé pourrait toucher le solde d'un autre ; renvoie un message d'erreur ou null
async function checkAccountOwnership(
  userId: string,
  accountId: string,
  categoryId: string | null,
): Promise<string | null> {
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId },
    select: { id: true },
  });
  if (!account) return "Compte introuvable";

  if (categoryId) {
    const category = await prisma.walletCategory.findFirst({
      where: { id: categoryId, accountId },
      select: { id: true },
    });
    if (!category) return "Poche introuvable";
  }

  return null;
}

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

export async function addInvestment(data: {
  accountId: string;
  categoryId: string | null;
  label: string;
  amount: number;
  date: Date;
  isRecurring: boolean;
  dateEndRecurring: Date | null;
}): Promise<ActionResult<Investment>> {
  try {
    const user = await getAuthenticatedUser();
    const amount = assertAmount(data.amount);

    const ownershipError = await checkAccountOwnership(user.id, data.accountId, data.categoryId ?? null);
    if (ownershipError) return { success: false, message: ownershipError };

    const shouldGenerate = new Date(data.date) <= new Date();

    // création + génération des versements dus dans une seule transaction (tout ou rien)
    const investment = await prisma.$transaction(async (tx) => {
      const created = await tx.investments.create({
        data: {
          userId: user.id,
          accountId: data.accountId,
          categoryId: data.categoryId ?? null,
          label: data.label,
          amount,
          date: new Date(data.date),
          isRecurring: data.isRecurring,
          dateEndRecurring: data.isRecurring ? (data.dateEndRecurring ?? null) : null,
        },
        include: { account: true, category: true },
      });

      // date passée ou aujourd'hui : on crée les versements dus tout de suite
      if (shouldGenerate) {
        await generateInvestmentTransactions(tx, created);
      }

      return created;
    });

    revalidatePath("/charges");
    return { success: true, message: "Placement ajouté", data: investment };
  } catch (err) {
    return fail("addInvestment", err, "Impossible d'ajouter le placement.");
  }
}

// ─────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────

export async function getInvestmentsByMonth(year: number, month: number) {
  const user = await getAuthenticatedUser();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 1);

  return prisma.investments.findMany({
    where: {
      userId: user.id,
      OR: [
        { date: { gte: startOfMonth, lt: endOfMonth } },
        {
          isRecurring: true,
          date: { lt: endOfMonth },
          OR: [{ dateEndRecurring: null }, { dateEndRecurring: { gte: startOfMonth } }],
        },
      ],
    },
    include: { account: true, category: true },
    orderBy: { date: "asc" },
  });
}

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

export async function updateInvestment(
  id: number,
  data: {
    accountId: string;
    categoryId: string | null;
    label: string;
    amount: number;
    date: Date;
    isRecurring: boolean;
    dateEndRecurring: Date | null;
  },
): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();
    const existing = await prisma.investments.findFirst({ where: { id, userId: user.id } });
    if (!existing) return { success: false, message: "Placement introuvable" };
    const amount = assertAmount(data.amount);

    const ownershipError = await checkAccountOwnership(user.id, data.accountId, data.categoryId ?? null);
    if (ownershipError) return { success: false, message: ownershipError };

    const now = new Date();

    // tout dans une transaction (annule, met à jour, régénère) : sinon un échec en cours retire l'argent des soldes sans le remettre
    await prisma.$transaction(async (tx) => {
      // 1. Annuler l'effet des anciens versements sur les soldes, puis les effacer
      const generated = await tx.walletTransaction.findMany({ where: { investmentId: id } });
      const total = generated.reduce((s, t) => s + t.amount, 0);
      if (total !== 0 && existing.categoryId) {
        await tx.walletCategory.update({
          where: { id: existing.categoryId },
          data: { balance: { decrement: total } },
        });
        await tx.financialAccount.update({
          where: { id: existing.accountId },
          data: { balance: { decrement: total } },
        });
      }
      await tx.walletTransaction.deleteMany({ where: { investmentId: id } });

      // 2. Appliquer les nouvelles valeurs (lastGeneratedAt remis à zéro pour tout recréer)
      const updated = await tx.investments.update({
        where: { id },
        data: {
          accountId: data.accountId,
          categoryId: data.categoryId ?? null,
          label: data.label,
          amount,
          date: new Date(data.date),
          isRecurring: data.isRecurring,
          dateEndRecurring: data.isRecurring ? (data.dateEndRecurring ?? null) : null,
          lastGeneratedAt: null,
        },
      });

      // 3. Recréer les versements passés au nouveau montant/poche, dans la même transaction
      if (new Date(updated.date) <= now) {
        await generateInvestmentTransactions(tx, updated);
      }
    });

    revalidatePath("/charges");
    return { success: true, message: "Placement modifié" };
  } catch (err) {
    return fail("updateInvestment", err, "Impossible de modifier le placement.");
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────

export async function deleteInvestment(id: number): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();
    const investment = await prisma.investments.findFirst({ where: { id, userId: user.id } });
    if (!investment) return { success: false, message: "Placement introuvable" };

    const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    if (investment.isRecurring && investment.date < startOfCurrentMonth) {
      const endOfLastMonth = new Date(startOfCurrentMonth);
      endOfLastMonth.setDate(0);
      await prisma.investments.update({
        where: { id },
        data: { dateEndRecurring: endOfLastMonth },
      });
      revalidatePath("/charges");
      return { success: true, message: "Récurrence arrêtée à partir de ce mois" };
    }

    await prisma.$transaction(async (tx) => {
      // retire des soldes l'argent versé par ce placement puis efface ses opérations, sinon il resterait compté dans la poche
      const generated = await tx.walletTransaction.findMany({ where: { investmentId: id } });
      const total = generated.reduce((s, t) => s + t.amount, 0);
      if (total !== 0 && investment.categoryId) {
        await tx.walletCategory.update({
          where: { id: investment.categoryId },
          data: { balance: { decrement: total } },
        });
        await tx.financialAccount.update({
          where: { id: investment.accountId },
          data: { balance: { decrement: total } },
        });
      }
      await tx.walletTransaction.deleteMany({ where: { investmentId: id } });
      await tx.investments.delete({ where: { id } });
    });
    revalidatePath("/charges");
    return { success: true, message: "Placement supprimé" };
  } catch (err) {
    return fail("deleteInvestment", err, "Impossible de supprimer le placement.");
  }
}
