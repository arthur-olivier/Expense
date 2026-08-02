// API démo des comptes d'épargne : rejoue la logique de wallet.actions.ts sur le store
// en mémoire. Mêmes signatures et mêmes retours (ActionResult) que les server actions,
// pour que l'aiguillage isDemo soit transparent pour l'UI.

import { assertAmount } from "@/lib/validation";
import { ok, ko } from "@/lib/actionResult";
import { getDB, commit, demoId, nextIntId } from "@/lib/demo/store";
import type { FinancialAccount, WalletCategory } from "@/app/generated/prisma/client";

type WalletWithCategories = FinancialAccount & { categories: WalletCategory[] };

// Rattache ses poches à un compte (équivalent du `include: { categories: true }`).
// On renvoie des copies : comme Prisma, une lecture est un instantané, pas une référence
// vive sur le store (sinon une mutation ultérieure modifierait des données déjà renvoyées).
function withCategories(account: FinancialAccount): WalletWithCategories {
  const categories = getDB()
    .walletCategories.filter((c) => c.accountId === account.id)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((c) => ({ ...c }));
  return { ...account, categories };
}

// ── READ ────────────────────────────────────────────────────────

export async function getWallets(): Promise<WalletWithCategories[]> {
  return getDB()
    .financialAccounts.slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(withCategories);
}

export async function getWallet(id: string): Promise<WalletWithCategories> {
  const wallet = getDB().financialAccounts.find((a) => a.id === id);
  if (!wallet) throw new Error("Wallet introuvable");
  return withCategories(wallet);
}

export async function getWalletTransactions(accountId: string) {
  const db = getDB();
  const categoryIds = new Set(db.walletCategories.filter((c) => c.accountId === accountId).map((c) => c.id));
  return db.walletTransactions
    .filter((t) => categoryIds.has(t.categoryId))
    .map((t) => ({ ...t, category: { ...db.walletCategories.find((c) => c.id === t.categoryId)! } }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

// ── CREATE ──────────────────────────────────────────────────────

export async function createWallet({
  name,
  isLocked,
  initialBalance = 0,
}: {
  name: string;
  isLocked: boolean;
  initialBalance?: number;
}) {
  initialBalance = assertAmount(initialBalance, { allowZero: true });
  const db = getDB();
  const created: FinancialAccount = {
    id: demoId("acc"),
    userId: "demo-user",
    name,
    isLocked,
    balance: initialBalance,
    balanceUpdatedAt: new Date(),
    createdAt: new Date(),
  };
  db.financialAccounts.push(created);

  const category: WalletCategory = {
    id: demoId("cat"),
    accountId: created.id,
    name: "Non catégorisé",
    balance: initialBalance,
    createdAt: new Date(),
  };
  db.walletCategories.push(category);

  if (initialBalance !== 0) {
    db.walletTransactions.push({
      id: nextIntId(db.walletTransactions),
      categoryId: category.id,
      investmentId: null,
      label: "Solde initial",
      amount: initialBalance,
      balanceAfter: initialBalance,
      date: new Date(),
      createdAt: new Date(),
    });
  }
  commit();
  return ok("Compte créé", created);
}

export async function createCategory(accountId: string, name: string) {
  const db = getDB();
  const wallet = db.financialAccounts.find((a) => a.id === accountId);
  if (!wallet) return ko("Compte introuvable.");
  const category: WalletCategory = {
    id: demoId("cat"),
    accountId,
    name,
    balance: 0,
    createdAt: new Date(),
  };
  db.walletCategories.push(category);
  commit();
  return ok("Poche créée", category);
}

// ── UPDATE ──────────────────────────────────────────────────────

export async function updateWallet(id: string, data: { name?: string; isLocked?: boolean }) {
  const wallet = getDB().financialAccounts.find((a) => a.id === id);
  if (!wallet) return ko("Compte introuvable.");
  if (data.name !== undefined) wallet.name = data.name;
  if (data.isLocked !== undefined) wallet.isLocked = data.isLocked;
  commit();
  return ok("Compte modifié", wallet);
}

export async function updateCategory(categoryId: string, name: string) {
  const category = getDB().walletCategories.find((c) => c.id === categoryId);
  if (!category) return ko("Catégorie introuvable.");
  category.name = name;
  commit();
  return ok("Poche modifiée", category);
}

// ── DELETE ──────────────────────────────────────────────────────

export async function deleteWallet(id: string) {
  const db = getDB();
  const wallet = db.financialAccounts.find((a) => a.id === id);
  if (!wallet) return ko("Compte introuvable.");
  const categoryIds = new Set(db.walletCategories.filter((c) => c.accountId === id).map((c) => c.id));
  db.walletTransactions = db.walletTransactions.filter((t) => !categoryIds.has(t.categoryId));
  db.walletCategories = db.walletCategories.filter((c) => c.accountId !== id);
  db.financialAccounts = db.financialAccounts.filter((a) => a.id !== id);
  commit();
  return ok("Compte supprimé");
}

export async function deleteCategory(categoryId: string) {
  const db = getDB();
  const category = db.walletCategories.find((c) => c.id === categoryId);
  if (!category) return ko("Catégorie introuvable.");
  if (category.balance !== 0) return ko("Vide la catégorie avant de la supprimer.");
  db.walletTransactions = db.walletTransactions.filter((t) => t.categoryId !== categoryId);
  db.walletCategories = db.walletCategories.filter((c) => c.id !== categoryId);
  commit();
  return ok("Poche supprimée");
}

// ── Mouvements d'argent ─────────────────────────────────────────

export async function addMoneyToAccount(accountId: string, categoryId: string, amount: number, label: string) {
  amount = assertAmount(amount);
  const db = getDB();
  const wallet = db.financialAccounts.find((a) => a.id === accountId);
  if (!wallet) return ko("Compte introuvable.");
  const category = db.walletCategories.find((c) => c.id === categoryId && c.accountId === accountId);
  if (!category) return ko("Catégorie introuvable.");

  const balanceAfter = wallet.balance + amount;
  db.walletTransactions.push(newTx(db, categoryId, amount, label, balanceAfter));
  category.balance += amount;
  wallet.balance += amount;
  wallet.balanceUpdatedAt = new Date();
  commit();
  return ok("Argent ajouté");
}

export async function withdrawMoney(categoryId: string, amount: number, label: string) {
  amount = assertAmount(amount);
  const db = getDB();
  const category = db.walletCategories.find((c) => c.id === categoryId);
  if (!category) return ko("Catégorie introuvable.");
  const wallet = db.financialAccounts.find((a) => a.id === category.accountId)!;
  if (category.balance < amount) return ko("Solde insuffisant dans cette poche.");

  const balanceAfter = wallet.balance - amount;
  db.walletTransactions.push(newTx(db, categoryId, -amount, label, balanceAfter));
  category.balance -= amount;
  wallet.balance -= amount;
  wallet.balanceUpdatedAt = new Date();
  commit();
  return ok("Argent retiré");
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
  amount = assertAmount(amount);
  const db = getDB();
  const from = db.walletCategories.find((c) => c.id === fromCategoryId);
  const to = db.walletCategories.find((c) => c.id === toCategoryId);
  if (!from) return ko("Poche source introuvable.");
  if (!to) return ko("Poche destination introuvable.");
  if (from.accountId === to.accountId) return ko("Utilisez le transfert interne pour le même compte.");
  if (from.balance < amount) return ko("Solde insuffisant dans la poche source.");

  const fromAccount = db.financialAccounts.find((a) => a.id === from.accountId)!;
  const toAccount = db.financialAccounts.find((a) => a.id === to.accountId)!;
  db.walletTransactions.push(
    newTx(db, fromCategoryId, -amount, `Virement → ${toAccount.name} / ${to.name} : ${label}`, fromAccount.balance - amount),
  );
  db.walletTransactions.push(
    newTx(db, toCategoryId, amount, `Virement ← ${fromAccount.name} / ${from.name} : ${label}`, toAccount.balance + amount),
  );
  from.balance -= amount;
  to.balance += amount;
  fromAccount.balance -= amount;
  toAccount.balance += amount;
  fromAccount.balanceUpdatedAt = new Date();
  toAccount.balanceUpdatedAt = new Date();
  commit();
  return ok("Virement effectué");
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
  amount = assertAmount(amount);
  const db = getDB();
  const from = db.walletCategories.find((c) => c.id === fromCategoryId);
  const to = db.walletCategories.find((c) => c.id === toCategoryId);
  if (!from) return ko("Catégorie source introuvable.");
  if (!to) return ko("Catégorie destination introuvable.");
  if (from.accountId !== to.accountId) return ko("Les catégories n'appartiennent pas au même compte.");
  if (from.balance < amount) return ko("Solde insuffisant dans la catégorie source.");
  if (fromCategoryId === toCategoryId) return ko("Les catégories doivent être différentes.");

  // Transfert interne : le solde du compte ne bouge pas, seules les poches changent
  const account = db.financialAccounts.find((a) => a.id === from.accountId)!;
  db.walletTransactions.push(newTx(db, fromCategoryId, -amount, `Transfert → ${to.name} : ${label}`, account.balance));
  db.walletTransactions.push(newTx(db, toCategoryId, amount, `Transfert ← ${from.name} : ${label}`, account.balance));
  from.balance -= amount;
  to.balance += amount;
  commit();
  return ok("Transfert effectué");
}

// ── Export des mouvements (WalletExportDialog) ──────────────────

export type TransactionExportScope = "month" | "year" | "all";

export async function getWalletsTransactionsForExport(scope: TransactionExportScope, accountId?: string) {
  const now = new Date();
  const start =
    scope === "month"
      ? new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
      : scope === "year"
        ? new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        : new Date(2000, 0, 1);

  const db = getDB();
  const accounts = db.financialAccounts
    .filter((a) => (accountId ? a.id === accountId : true))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return accounts.map((account) => {
    const categoryIds = new Set(db.walletCategories.filter((c) => c.accountId === account.id).map((c) => c.id));
    const transactions = db.walletTransactions
      .filter((t) => categoryIds.has(t.categoryId) && t.date >= start && t.date <= now)
      .map((t) => ({ ...t, category: { ...db.walletCategories.find((c) => c.id === t.categoryId)! } }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    return { accountId: account.id, accountName: account.name, transactions };
  });
}

// Fabrique une ligne de transaction avec un id auto-incrémenté
function newTx(
  db: ReturnType<typeof getDB>,
  categoryId: string,
  amount: number,
  label: string,
  balanceAfter: number,
) {
  return {
    id: nextIntId(db.walletTransactions),
    categoryId,
    investmentId: null,
    label,
    amount,
    balanceAfter,
    date: new Date(),
    createdAt: new Date(),
  };
}
