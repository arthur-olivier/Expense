// API démo des charges (revenus, dépenses, placements) + génération des versements récurrents,
// rejouée sur le store. Miroir de charges/*.actions.ts. Mêmes signatures et retours.

import { assertAmount } from "@/lib/validation";
import { getDB, commit, nextIntId } from "@/lib/demo/store";
import type { Incomes, Expenses, Investments } from "@/app/generated/prisma/client";

const USER = "demo-user";

// Sélectionne les lignes du mois : datées dans le mois, ou récurrentes encore actives
function inMonth(r: { date: Date; isRecurring: boolean; dateEndRecurring: Date | null }, start: Date, end: Date) {
  const dated = r.date >= start && r.date < end;
  const recurring = r.isRecurring && r.date < end && (!r.dateEndRecurring || r.dateEndRecurring >= start);
  return dated || recurring;
}

// Ajoute un mois en gérant les fins de mois (31 janv → 28/29 févr)
function addOneMonth(date: Date): Date {
  const d = date.getDate();
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  if (next.getDate() !== d) next.setDate(0);
  return next;
}

// Génère les versements dus d'un placement et met à jour les soldes (version démo)
function generateInvestmentTransactions(inv: Investments) {
  if (!inv.categoryId) return;
  const db = getDB();
  const now = new Date();
  const cursor = inv.lastGeneratedAt ? addOneMonth(inv.lastGeneratedAt) : new Date(inv.date);
  const dates: Date[] = [];
  let current = new Date(cursor);
  while (current <= now) {
    if (inv.dateEndRecurring && current > inv.dateEndRecurring) break;
    dates.push(new Date(current));
    if (!inv.isRecurring) break;
    current = addOneMonth(current);
  }
  if (dates.length === 0) return;

  const account = db.financialAccounts.find((a) => a.id === inv.accountId);
  const category = db.walletCategories.find((c) => c.id === inv.categoryId);
  if (!account || !category) return;

  let running = account.balance;
  for (const d of dates) {
    running += inv.amount;
    db.walletTransactions.push({
      id: nextIntId(db.walletTransactions),
      categoryId: inv.categoryId,
      investmentId: inv.id,
      label: inv.label,
      amount: inv.amount,
      date: d,
      balanceAfter: running,
      createdAt: new Date(),
    });
  }
  const total = inv.amount * dates.length;
  category.balance += total;
  account.balance += total;
  account.balanceUpdatedAt = new Date();
  inv.lastGeneratedAt = dates[dates.length - 1];
}

// Annule l'effet des versements d'un placement puis les efface
function reverseInvestmentTransactions(inv: Investments) {
  const db = getDB();
  const generated = db.walletTransactions.filter((t) => t.investmentId === inv.id);
  const total = generated.reduce((s, t) => s + t.amount, 0);
  if (total !== 0 && inv.categoryId) {
    const category = db.walletCategories.find((c) => c.id === inv.categoryId);
    const account = db.financialAccounts.find((a) => a.id === inv.accountId);
    if (category) category.balance -= total;
    if (account) account.balance -= total;
  }
  db.walletTransactions = db.walletTransactions.filter((t) => t.investmentId !== inv.id);
}

// ── REVENUS ─────────────────────────────────────────────────────

export async function addRevenu(data: Omit<Incomes, "id" | "userId">) {
  const db = getDB();
  const revenu: Incomes = {
    id: nextIntId(db.incomes),
    userId: USER,
    label: data.label,
    amount: assertAmount(data.amount),
    date: new Date(data.date),
    isRecurring: data.isRecurring,
    dateEndRecurring: data.isRecurring ? (data.dateEndRecurring ?? null) : null,
  };
  db.incomes.push(revenu);
  commit();
  return { success: true, message: "Revenu ajouté", data: revenu };
}

export async function getRevenusByMonth(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return getDB()
    .incomes.filter((r) => r.userId === USER && inMonth(r, start, end))
    .map((r) => ({ ...r }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function updateRevenu(id: number, data: Omit<Incomes, "id" | "userId">) {
  const revenu = getDB().incomes.find((r) => r.id === id);
  if (!revenu) return { success: false, message: "Revenu introuvable" };
  revenu.label = data.label;
  revenu.amount = assertAmount(data.amount);
  revenu.date = new Date(data.date);
  revenu.isRecurring = data.isRecurring;
  revenu.dateEndRecurring = data.isRecurring ? (data.dateEndRecurring ?? null) : null;
  commit();
  return { success: true, message: "Revenu modifié" };
}

export async function deleteRevenu(id: number) {
  const db = getDB();
  const revenu = db.incomes.find((r) => r.id === id);
  if (!revenu) return { success: false, message: "Revenu introuvable" };
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  if (revenu.isRecurring && revenu.date < startOfMonth) {
    const endOfLast = new Date(startOfMonth);
    endOfLast.setDate(0);
    revenu.dateEndRecurring = endOfLast;
    commit();
    return { success: true, message: "Récurrence arrêtée à partir de ce mois" };
  }
  db.incomes = db.incomes.filter((r) => r.id !== id);
  commit();
  return { success: true, message: "Revenu supprimé" };
}

// ── DÉPENSES ────────────────────────────────────────────────────

export async function addDepense(data: Omit<Expenses, "id" | "userId">) {
  const db = getDB();
  const depense: Expenses = {
    id: nextIntId(db.expenses),
    userId: USER,
    label: data.label,
    amount: assertAmount(data.amount),
    date: new Date(data.date),
    isRecurring: data.isRecurring,
    dateEndRecurring: data.isRecurring ? (data.dateEndRecurring ?? null) : null,
    category: data.category,
  };
  db.expenses.push(depense);
  commit();
  return { success: true, message: "Dépense ajoutée", data: depense };
}

export async function getDepensesByMonth(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return getDB()
    .expenses.filter((r) => r.userId === USER && inMonth(r, start, end))
    .map((r) => ({ ...r }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

export async function updateDepense(id: number, data: Omit<Expenses, "id" | "userId">) {
  const depense = getDB().expenses.find((r) => r.id === id);
  if (!depense) return { success: false, message: "Dépense introuvable" };
  depense.label = data.label;
  depense.amount = assertAmount(data.amount);
  depense.date = new Date(data.date);
  depense.isRecurring = data.isRecurring;
  depense.dateEndRecurring = data.isRecurring ? (data.dateEndRecurring ?? null) : null;
  depense.category = data.category;
  commit();
  return { success: true, message: "Dépense modifiée" };
}

export async function deleteDepense(id: number) {
  const db = getDB();
  const depense = db.expenses.find((r) => r.id === id);
  if (!depense) return { success: false, message: "Dépense introuvable" };
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  if (depense.isRecurring && depense.date < startOfMonth) {
    const endOfLast = new Date(startOfMonth);
    endOfLast.setDate(0);
    depense.dateEndRecurring = endOfLast;
    commit();
    return { success: true, message: "Récurrence arrêtée à partir de ce mois" };
  }
  db.expenses = db.expenses.filter((r) => r.id !== id);
  commit();
  return { success: true, message: "Dépense supprimée" };
}

// ── PLACEMENTS (avec versements récurrents) ─────────────────────

function withAccountCategory(inv: Investments) {
  const db = getDB();
  return {
    ...inv,
    account: { ...db.financialAccounts.find((a) => a.id === inv.accountId)! },
    category: inv.categoryId ? { ...db.walletCategories.find((c) => c.id === inv.categoryId)! } : null,
  };
}

// Vérifie que le compte existe et que la poche dépend bien de ce compte
function accountError(accountId: string, categoryId: string | null): string | null {
  const db = getDB();
  if (!db.financialAccounts.some((a) => a.id === accountId)) return "Compte introuvable";
  if (categoryId && !db.walletCategories.some((c) => c.id === categoryId && c.accountId === accountId)) return "Poche introuvable";
  return null;
}

export async function addInvestment(data: {
  accountId: string;
  categoryId: string | null;
  label: string;
  amount: number;
  date: Date;
  isRecurring: boolean;
  dateEndRecurring: Date | null;
}) {
  const err = accountError(data.accountId, data.categoryId ?? null);
  if (err) return { success: false, message: err };
  const db = getDB();
  const investment: Investments = {
    id: nextIntId(db.investments),
    userId: USER,
    accountId: data.accountId,
    categoryId: data.categoryId ?? null,
    label: data.label,
    amount: assertAmount(data.amount),
    date: new Date(data.date),
    isRecurring: data.isRecurring,
    dateEndRecurring: data.isRecurring ? (data.dateEndRecurring ?? null) : null,
    lastGeneratedAt: null,
  };
  db.investments.push(investment);
  if (new Date(data.date) <= new Date()) generateInvestmentTransactions(investment);
  commit();
  return { success: true, message: "Placement ajouté", data: withAccountCategory(investment) };
}

export async function getInvestmentsByMonth(year: number, month: number) {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return getDB()
    .investments.filter((r) => r.userId === USER && inMonth(r, start, end))
    .map(withAccountCategory)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

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
) {
  const db = getDB();
  const existing = db.investments.find((r) => r.id === id);
  if (!existing) return { success: false, message: "Placement introuvable" };
  const err = accountError(data.accountId, data.categoryId ?? null);
  if (err) return { success: false, message: err };

  reverseInvestmentTransactions(existing);
  existing.accountId = data.accountId;
  existing.categoryId = data.categoryId ?? null;
  existing.label = data.label;
  existing.amount = assertAmount(data.amount);
  existing.date = new Date(data.date);
  existing.isRecurring = data.isRecurring;
  existing.dateEndRecurring = data.isRecurring ? (data.dateEndRecurring ?? null) : null;
  existing.lastGeneratedAt = null;
  if (new Date(existing.date) <= new Date()) generateInvestmentTransactions(existing);
  commit();
  return { success: true, message: "Placement modifié" };
}

export async function deleteInvestment(id: number) {
  const db = getDB();
  const investment = db.investments.find((r) => r.id === id);
  if (!investment) return { success: false, message: "Placement introuvable" };

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  if (investment.isRecurring && investment.date < startOfMonth) {
    const endOfLast = new Date(startOfMonth);
    endOfLast.setDate(0);
    investment.dateEndRecurring = endOfLast;
    commit();
    return { success: true, message: "Récurrence arrêtée à partir de ce mois" };
  }
  reverseInvestmentTransactions(investment);
  db.investments = db.investments.filter((r) => r.id !== id);
  commit();
  return { success: true, message: "Placement supprimé" };
}

// ── EXPORT ──────────────────────────────────────────────────────

export type ExportScope = "month" | "year" | "all";

// Bornes selon la portée choisie (mois courant, année, ou tout l'historique)
function exportRange(scope: ExportScope, year: number, month: number) {
  if (scope === "month") return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
  if (scope === "year") return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
  return { start: new Date(2000, 0, 1), end: new Date(9999, 0, 1) };
}

export async function getExportData(scope: ExportScope, year: number, month: number) {
  const { start, end } = exportRange(scope, year, month);
  const db = getDB();
  const keep = (r: { date: Date; isRecurring: boolean; dateEndRecurring: Date | null }) => inMonth(r, start, end);
  return {
    revenus: db.incomes.filter(keep).sort((a, b) => a.date.getTime() - b.date.getTime()),
    depenses: db.expenses.filter(keep).sort((a, b) => a.date.getTime() - b.date.getTime()),
    investments: db.investments.filter(keep).map(withAccountCategory).sort((a, b) => a.date.getTime() - b.date.getTime()),
  };
}
