"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { assertAmount } from "@/lib/validation";
import { UserError, guardAction, ok, ko, fail } from "@/lib/actionResult";

// les get… renvoient les données ; les mutations renvoient un ActionResult { success, message } affiché tel quel

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

export async function createWallet({
  name,
  isLocked,
  initialBalance = 0,
}: {
  name: string;
  isLocked: boolean;
  initialBalance?: number;
}) {
  try {
    const user = await getAuthenticatedUser();
    initialBalance = assertAmount(initialBalance, { allowZero: true });
    const wallet = await prisma.$transaction(async (tx) => {
      const created = await tx.financialAccount.create({
        data: {
          userId: user.id,
          name,
          isLocked,
          balance: initialBalance,
          balanceUpdatedAt: new Date(),
        },
      });
      const defaultCategory = await tx.walletCategory.create({
        data: { accountId: created.id, name: "Non catégorisé", balance: initialBalance },
      });
      if (initialBalance !== 0) {
        await tx.walletTransaction.create({
          data: {
            categoryId: defaultCategory.id,
            label: "Solde initial",
            amount: initialBalance,
            balanceAfter: initialBalance,
          },
        });
      }
      return created;
    });
    return ok("Compte créé", wallet);
  } catch (err) {
    return fail("createWallet", err, "Impossible de créer le compte.");
  }
}

export async function createCategory(accountId: string, name: string) {
  try {
    const user = await getAuthenticatedUser();
    const wallet = await prisma.financialAccount.findFirst({
      where: { id: accountId, userId: user.id },
    });
    if (!wallet) return ko("Compte introuvable.");
    const category = await prisma.walletCategory.create({ data: { accountId, name, balance: 0 } });
    return ok("Poche créée", category);
  } catch (err) {
    return fail("createCategory", err, "Impossible de créer la poche.");
  }
}

// ─────────────────────────────────────────────────────────────
// READ (renvoient les données ; lèvent en cas d'erreur)
// ─────────────────────────────────────────────────────────────

export async function getWallets() {
  return guardAction("getWallets", async () => {
    const user = await getAuthenticatedUser();
    return prisma.financialAccount.findMany({
      where: { userId: user.id },
      include: { categories: true },
      orderBy: { createdAt: "asc" },
    });
  });
}

export async function getWallet(id: string) {
  return guardAction("getWallet", async () => {
    const user = await getAuthenticatedUser();
    const wallet = await prisma.financialAccount.findFirst({
      where: { id, userId: user.id },
      include: { categories: true },
    });
    if (!wallet) throw new UserError("Wallet introuvable");
    return wallet;
  });
}

export async function getWalletTransactions(accountId: string) {
  return guardAction("getWalletTransactions", async () => {
    const user = await getAuthenticatedUser();
    const wallet = await prisma.financialAccount.findFirst({
      where: { id: accountId, userId: user.id },
    });
    if (!wallet) throw new UserError("Wallet introuvable");
    return prisma.walletTransaction.findMany({
      where: { category: { accountId } },
      include: { category: true },
      orderBy: { date: "desc" },
    });
  });
}

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

export async function updateWallet(id: string, data: { name?: string; isLocked?: boolean }) {
  try {
    const user = await getAuthenticatedUser();
    const wallet = await prisma.financialAccount.findFirst({ where: { id, userId: user.id } });
    if (!wallet) return ko("Compte introuvable.");
    const updated = await prisma.financialAccount.update({ where: { id }, data });
    return ok("Compte modifié", updated);
  } catch (err) {
    return fail("updateWallet", err, "Impossible de modifier le compte.");
  }
}

export async function updateCategory(categoryId: string, name: string) {
  try {
    const user = await getAuthenticatedUser();
    const category = await prisma.walletCategory.findFirst({
      where: { id: categoryId },
      include: { account: true },
    });
    if (!category || category.account.userId !== user.id) return ko("Catégorie introuvable.");
    const updated = await prisma.walletCategory.update({ where: { id: categoryId }, data: { name } });
    return ok("Poche modifiée", updated);
  } catch (err) {
    return fail("updateCategory", err, "Impossible de modifier la poche.");
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────

export async function deleteWallet(id: string) {
  try {
    const user = await getAuthenticatedUser();
    const wallet = await prisma.financialAccount.findFirst({ where: { id, userId: user.id } });
    if (!wallet) return ko("Compte introuvable.");
    await prisma.financialAccount.delete({ where: { id } });
    return ok("Compte supprimé");
  } catch (err) {
    return fail("deleteWallet", err, "Impossible de supprimer le compte.");
  }
}

export async function deleteCategory(categoryId: string) {
  try {
    const user = await getAuthenticatedUser();
    const category = await prisma.walletCategory.findFirst({
      where: { id: categoryId },
      include: { account: true },
    });
    if (!category || category.account.userId !== user.id) return ko("Catégorie introuvable.");
    if (category.balance !== 0) return ko("Vide la catégorie avant de la supprimer.");
    await prisma.walletCategory.delete({ where: { id: categoryId } });
    return ok("Poche supprimée");
  } catch (err) {
    return fail("deleteCategory", err, "Impossible de supprimer la poche.");
  }
}

// ─────────────────────────────────────────────────────────────
// Mouvements d'argent (dépôts, retraits, virements)
// ─────────────────────────────────────────────────────────────

export async function addMoneyToAccount(
  accountId: string,
  categoryId: string,
  amount: number,
  label: string,
) {
  try {
    const user = await getAuthenticatedUser();
    amount = assertAmount(amount);
    const wallet = await prisma.financialAccount.findFirst({
      where: { id: accountId, userId: user.id },
    });
    if (!wallet) return ko("Compte introuvable.");
    const category = await prisma.walletCategory.findFirst({ where: { id: categoryId, accountId } });
    if (!category) return ko("Catégorie introuvable.");

    await prisma.$transaction(async (tx) => {
      const balanceAfter = wallet.balance + amount;
      await tx.walletTransaction.create({ data: { categoryId, amount, label, balanceAfter } });
      await tx.walletCategory.update({
        where: { id: categoryId },
        data: { balance: { increment: amount } },
      });
      await tx.financialAccount.update({
        where: { id: accountId },
        data: { balance: { increment: amount }, balanceUpdatedAt: new Date() },
      });
    });
    return ok("Argent ajouté");
  } catch (err) {
    return fail("addMoneyToAccount", err, "Opération impossible.");
  }
}

export async function withdrawMoney(categoryId: string, amount: number, label: string) {
  try {
    const user = await getAuthenticatedUser();
    amount = assertAmount(amount);
    const category = await prisma.walletCategory.findFirst({
      where: { id: categoryId },
      include: { account: true },
    });
    if (!category || category.account.userId !== user.id) return ko("Catégorie introuvable.");
    if (category.balance < amount) return ko("Solde insuffisant dans cette poche.");

    await prisma.$transaction(async (tx) => {
      const balanceAfter = category.account.balance - amount;
      await tx.walletTransaction.create({
        data: { categoryId, amount: -amount, label, balanceAfter },
      });
      await tx.walletCategory.update({
        where: { id: categoryId },
        data: { balance: { decrement: amount } },
      });
      await tx.financialAccount.update({
        where: { id: category.accountId },
        data: { balance: { decrement: amount }, balanceUpdatedAt: new Date() },
      });
    });
    return ok("Argent retiré");
  } catch (err) {
    return fail("withdrawMoney", err, "Opération impossible.");
  }
}

export async function withdrawMoneyToOtherAccount({
  fromCategoryId,
  toCategoryId,
  amount,
  label,
}: {
  fromCategoryId: string;
  toCategoryId: string;
  amount: number;
  label: string;
}) {
  try {
    const user = await getAuthenticatedUser();
    amount = assertAmount(amount);

    const from = await prisma.walletCategory.findFirst({
      where: { id: fromCategoryId },
      include: { account: true },
    });
    const to = await prisma.walletCategory.findFirst({
      where: { id: toCategoryId },
      include: { account: true },
    });

    if (!from || from.account.userId !== user.id) return ko("Poche source introuvable.");
    if (!to || to.account.userId !== user.id) return ko("Poche destination introuvable.");
    if (from.accountId === to.accountId)
      return ko("Utilisez le transfert interne pour le même compte.");
    if (from.balance < amount) return ko("Solde insuffisant dans la poche source.");

    await prisma.$transaction(async (tx) => {
      const fromBalanceAfter = from.account.balance - amount;
      const toBalanceAfter = to.account.balance + amount;
      await tx.walletTransaction.create({
        data: {
          categoryId: fromCategoryId,
          amount: -amount,
          label: `Virement → ${to.account.name} / ${to.name} : ${label}`,
          balanceAfter: fromBalanceAfter,
        },
      });
      await tx.walletTransaction.create({
        data: {
          categoryId: toCategoryId,
          amount,
          label: `Virement ← ${from.account.name} / ${from.name} : ${label}`,
          balanceAfter: toBalanceAfter,
        },
      });
      await tx.walletCategory.update({
        where: { id: fromCategoryId },
        data: { balance: { decrement: amount } },
      });
      await tx.walletCategory.update({
        where: { id: toCategoryId },
        data: { balance: { increment: amount } },
      });
      await tx.financialAccount.update({
        where: { id: from.accountId },
        data: { balance: { decrement: amount }, balanceUpdatedAt: new Date() },
      });
      await tx.financialAccount.update({
        where: { id: to.accountId },
        data: { balance: { increment: amount }, balanceUpdatedAt: new Date() },
      });
    });
    return ok("Virement effectué");
  } catch (err) {
    return fail("withdrawMoneyToOtherAccount", err, "Opération impossible.");
  }
}

export async function transferMoney({
  fromCategoryId,
  toCategoryId,
  amount,
  label,
}: {
  fromCategoryId: string;
  toCategoryId: string;
  amount: number;
  label: string;
}) {
  try {
    const user = await getAuthenticatedUser();
    amount = assertAmount(amount);

    const from = await prisma.walletCategory.findFirst({
      where: { id: fromCategoryId },
      include: { account: true },
    });
    const to = await prisma.walletCategory.findFirst({
      where: { id: toCategoryId },
      include: { account: true },
    });

    if (!from || from.account.userId !== user.id) return ko("Catégorie source introuvable.");
    if (!to || to.account.userId !== user.id) return ko("Catégorie destination introuvable.");
    if (from.accountId !== to.accountId)
      return ko("Les catégories n'appartiennent pas au même compte.");
    if (from.balance < amount) return ko("Solde insuffisant dans la catégorie source.");
    if (fromCategoryId === toCategoryId) return ko("Les catégories doivent être différentes.");

    await prisma.$transaction(async (tx) => {
      // transfert interne : le solde du compte ne bouge pas, seules les poches changent
      const balanceAfter = from.account.balance;
      await tx.walletTransaction.create({
        data: {
          categoryId: fromCategoryId,
          amount: -amount,
          label: `Transfert → ${to.name} : ${label}`,
          balanceAfter,
        },
      });
      await tx.walletTransaction.create({
        data: {
          categoryId: toCategoryId,
          amount,
          label: `Transfert ← ${from.name} : ${label}`,
          balanceAfter,
        },
      });
      await tx.walletCategory.update({
        where: { id: fromCategoryId },
        data: { balance: { decrement: amount } },
      });
      await tx.walletCategory.update({
        where: { id: toCategoryId },
        data: { balance: { increment: amount } },
      });
    });
    return ok("Transfert effectué");
  } catch (err) {
    return fail("transferMoney", err, "Transfert impossible.");
  }
}
