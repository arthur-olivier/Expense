// API démo du portefeuille boursier : portefeuilles, positions, mouvements, courtiers.
// Miroir de portfolio/*.actions.ts sur le store, en réutilisant les calculs purs
// (recomputePosition, computeAssetPerformance). L'import de fichiers courtier est désactivé
// en démo (niche) : voir plus bas.

import { assertAmount } from "@/lib/validation";
import { ok, ko } from "@/lib/actionResult";
import { getDB, commit, demoId } from "@/lib/demo/store";
import {
  recomputePosition,
  computeAssetPerformance,
  computeBuyAmount,
  computeSellAmount,
} from "@/lib/calculations/portfolio-calculations";
import type { Portfolio, Asset, PortfolioTransaction, Broker } from "@/app/generated/prisma/client";
import type { AssetPerformance } from "@/types/portfolio";

const USER = "demo-user";
const clone = <T>(x: T): T => ({ ...x });

// ── Helpers de recalcul (équivalents de portfolio/shared.ts) ────

// Rejoue l'historique BUY/SELL d'un actif pour redériver quantité + PRU
function recalcPosition(portfolioId: string, assetId: string) {
  const db = getDB();
  const txns = db.portfolioTransactions
    .filter((t) => t.portfolioId === portfolioId && t.assetId === assetId && (t.type === "BUY" || t.type === "SELL"))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const state = recomputePosition(txns.map((t) => ({ type: t.type, quantity: t.quantity, price: t.price, fees: t.fees, date: t.date })));
  const pos = db.positions.find((p) => p.portfolioId === portfolioId && p.assetId === assetId);
  if (pos) {
    pos.quantity = state.quantity;
    pos.pru = state.pru;
    pos.updatedAt = new Date();
  } else {
    db.positions.push({ id: demoId("pos"), portfolioId, assetId, quantity: state.quantity, pru: state.pru, updatedAt: new Date() });
  }
}

// Redérive le cash du courtier depuis ses mouvements + reconstruit la chaîne balanceAfter
function recalcBrokerBalance(brokerId: string) {
  const db = getDB();
  const txns = db.brokerCashTransactions
    .filter((t) => t.brokerId === brokerId)
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
  let running = 0;
  for (const t of txns) {
    running += t.amount;
    t.balanceAfter = running;
  }
  const broker = db.brokers.find((b) => b.id === brokerId);
  if (broker) broker.cashBalance = running;
}

// Redérive le cash d'un portefeuille hasOwnCash = somme de ses transactions
function recalcPortfolioCashBalance(portfolioId: string) {
  const db = getDB();
  const sum = db.portfolioTransactions.filter((t) => t.portfolioId === portfolioId).reduce((s, t) => s + t.amount, 0);
  const p = db.portfolios.find((x) => x.id === portfolioId);
  if (p) p.cashBalance = sum;
}

// Solde cash du bon détenteur (portefeuille lui-même ou courtier si cash délégué)
function cashHolderBalance(p: Portfolio) {
  if (p.hasOwnCash) return p.cashBalance;
  const broker = getDB().brokers.find((b) => b.id === p.brokerId);
  return broker?.cashBalance ?? 0;
}

// Répercute l'effet cash d'un mouvement sur le bon détenteur
function applyCashEffect(p: Portfolio, type: string, amount: number, date: Date, portfolioTransactionId: string) {
  const db = getDB();
  if (p.hasOwnCash) {
    p.cashBalance += amount;
    return;
  }
  const broker = db.brokers.find((b) => b.id === p.brokerId)!;
  db.brokerCashTransactions.push({
    id: demoId("bct"),
    brokerId: broker.id,
    portfolioId: p.id,
    portfolioTransactionId,
    type,
    amount,
    balanceAfter: broker.cashBalance + amount,
    date,
    externalId: null,
    counterpartyLabel: null,
    createdAt: new Date(),
  });
  broker.cashBalance += amount;
}

// Dépôt automatique pour combler un manque de cash avant un achat
function applyAutoDeposit(p: Portfolio, shortfall: number, date: Date) {
  const db = getDB();
  if (p.hasOwnCash) {
    db.portfolioTransactions.push(newPt(p.id, null, "DEPOSIT", null, null, shortfall, 0, date));
    p.cashBalance += shortfall;
    return;
  }
  const broker = db.brokers.find((b) => b.id === p.brokerId)!;
  db.brokerCashTransactions.push({
    id: demoId("bct"),
    brokerId: broker.id,
    portfolioId: null,
    portfolioTransactionId: null,
    type: "DEPOSIT",
    amount: shortfall,
    balanceAfter: broker.cashBalance + shortfall,
    date,
    externalId: null,
    counterpartyLabel: null,
    createdAt: new Date(),
  });
  broker.cashBalance += shortfall;
}

// Fabrique une transaction de portefeuille
function newPt(
  portfolioId: string,
  assetId: string | null,
  type: string,
  quantity: number | null,
  price: number | null,
  amount: number,
  fees: number,
  date: Date,
): PortfolioTransaction {
  return {
    id: demoId("pt"),
    portfolioId,
    assetId,
    type,
    quantity,
    price,
    amount,
    fees,
    date,
    externalId: null,
    counterpartyLabel: null,
    createdAt: new Date(),
  };
}

// ── PORTEFEUILLES ───────────────────────────────────────────────

function hydratePortfolio(p: Portfolio) {
  const db = getDB();
  return {
    ...p,
    positions: db.positions
      .filter((pos) => pos.portfolioId === p.id)
      .map((pos) => ({ ...pos, asset: clone(db.assets.find((a) => a.id === pos.assetId)!) })),
    broker: p.brokerId ? clone(db.brokers.find((b) => b.id === p.brokerId)!) : null,
  };
}

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
  if (!hasOwnCash && !brokerId) throw new Error("Un portefeuille sans cash propre doit être associé à un courtier.");
  const db = getDB();
  if (brokerId && !db.brokers.some((b) => b.id === brokerId)) throw new Error("Courtier introuvable");
  const portfolio: Portfolio = {
    id: demoId("pf"),
    userId: USER,
    brokerId: brokerId ?? null,
    name,
    type,
    hasOwnCash,
    openedAt: new Date(openedAt),
    cashBalance: 0,
    createdAt: new Date(),
  };
  db.portfolios.push(portfolio);
  commit();
  return clone(portfolio);
}

export async function updatePortfolioOpenedAt(portfolioId: string, openedAt: Date) {
  const portfolio = getDB().portfolios.find((p) => p.id === portfolioId);
  if (!portfolio) throw new Error("Portefeuille introuvable");
  portfolio.openedAt = new Date(openedAt);
  commit();
  return clone(portfolio);
}

export async function getPortfolios() {
  return getDB()
    .portfolios.slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(hydratePortfolio);
}

export async function getPortfolio(id: string) {
  const portfolio = getDB().portfolios.find((p) => p.id === id);
  if (!portfolio) throw new Error("Portefeuille introuvable");
  return hydratePortfolio(portfolio);
}

export async function getPortfolioTransactions(portfolioId: string) {
  const db = getDB();
  return db.portfolioTransactions
    .filter((t) => t.portfolioId === portfolioId)
    .map((t) => ({ ...t, asset: t.assetId ? clone(db.assets.find((a) => a.id === t.assetId)!) : null }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function getAssetPerformance(portfolioId: string, assetId: string): Promise<AssetPerformance> {
  const db = getDB();
  const asset = db.assets.find((a) => a.id === assetId);
  if (!asset) throw new Error("Titre introuvable");
  const position = db.positions.find((p) => p.portfolioId === portfolioId && p.assetId === assetId);
  const transactions = db.portfolioTransactions
    .filter((t) => t.portfolioId === portfolioId && t.assetId === assetId && ["BUY", "SELL", "DIVIDEND"].includes(t.type))
    .map((t) => ({ type: t.type, amount: t.amount, date: t.date }));
  return computeAssetPerformance({
    transactions,
    position: { quantity: position?.quantity ?? 0, pru: position?.pru ?? 0 },
    lastPrice: asset.lastPrice,
  });
}

export async function getPortfolioOpenedAtMax(portfolioId: string): Promise<Date> {
  const first = getDB()
    .portfolioTransactions.filter((t) => t.portfolioId === portfolioId)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const now = new Date();
  return first && first.date.getTime() < now.getTime() ? first.date : now;
}

// ── ACTIFS ──────────────────────────────────────────────────────

export async function createAssetManual({
  name,
  isin,
  ticker,
  currency,
  lastPrice,
}: {
  name: string;
  isin?: string;
  ticker?: string;
  currency: string;
  lastPrice?: number;
}) {
  const db = getDB();
  const asset: Asset = {
    id: demoId("ast"),
    userId: USER,
    name,
    isin: isin ?? null,
    ticker: ticker ?? null,
    currency,
    autoUpdate: false,
    lastPrice: lastPrice ?? null,
    lastPriceAt: lastPrice !== undefined ? new Date() : null,
  };
  db.assets.push(asset);
  commit();
  return clone(asset);
}

export async function getOwnedAssets() {
  const db = getDB();
  const seen = new Set<string>();
  const result: Asset[] = [];
  for (const pos of db.positions.filter((p) => p.quantity > 0)) {
    if (seen.has(pos.assetId)) continue;
    seen.add(pos.assetId);
    const asset = db.assets.find((a) => a.id === pos.assetId);
    if (asset) result.push(clone(asset));
  }
  return result.sort((a, b) => a.name.localeCompare(b.name));
}

export async function updateAssetPrice(assetId: string, price: number) {
  const asset = getDB().assets.find((a) => a.id === assetId);
  if (!asset) throw new Error("Titre introuvable");
  asset.lastPrice = price;
  asset.lastPriceAt = new Date();
  commit();
  return clone(asset);
}

export async function updateAssetPrices(updates: { assetId: string; price: number }[]) {
  const db = getDB();
  const now = new Date();
  for (const u of updates) {
    const asset = db.assets.find((a) => a.id === u.assetId);
    if (asset) {
      asset.lastPrice = u.price;
      asset.lastPriceAt = now;
    }
  }
  commit();
}

// ── COURTIERS ───────────────────────────────────────────────────

export async function createBroker({ name }: { name: string }) {
  const db = getDB();
  const broker: Broker = { id: demoId("brk"), userId: USER, name, cashBalance: 0, createdAt: new Date() };
  db.brokers.push(broker);
  commit();
  return ok("Courtier créé", clone(broker));
}

export async function getBrokers() {
  return getDB()
    .brokers.slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map(clone);
}

export async function getBrokerTransactions(brokerId: string) {
  const db = getDB();
  return db.brokerCashTransactions
    .filter((t) => t.brokerId === brokerId)
    .map((t) => {
      const pf = t.portfolioId ? db.portfolios.find((p) => p.id === t.portfolioId) : null;
      const pt = t.portfolioTransactionId ? db.portfolioTransactions.find((x) => x.id === t.portfolioTransactionId) : null;
      const asset = pt?.assetId ? db.assets.find((a) => a.id === pt.assetId) : null;
      return {
        ...t,
        portfolio: pf ? { name: pf.name } : null,
        portfolioTransaction: pt ? { asset: asset ? { name: asset.name } : null } : null,
      };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function addBrokerDeposit({ brokerId, amount, date }: { brokerId: string; amount: number; date: Date }) {
  amount = assertAmount(amount);
  const db = getDB();
  const broker = db.brokers.find((b) => b.id === brokerId);
  if (!broker) return ko("Courtier introuvable.");
  db.brokerCashTransactions.push({
    id: demoId("bct"),
    brokerId,
    portfolioId: null,
    portfolioTransactionId: null,
    type: "DEPOSIT",
    amount,
    balanceAfter: broker.cashBalance + amount,
    date: new Date(date),
    externalId: null,
    counterpartyLabel: null,
    createdAt: new Date(),
  });
  broker.cashBalance += amount;
  commit();
  return ok("Mouvement enregistré");
}

export async function addBrokerWithdrawal({ brokerId, amount, date }: { brokerId: string; amount: number; date: Date }) {
  amount = assertAmount(amount);
  const db = getDB();
  const broker = db.brokers.find((b) => b.id === brokerId);
  if (!broker) return ko("Courtier introuvable.");
  if (broker.cashBalance < amount) return ko("Solde en cash insuffisant.");
  db.brokerCashTransactions.push({
    id: demoId("bct"),
    brokerId,
    portfolioId: null,
    portfolioTransactionId: null,
    type: "WITHDRAWAL",
    amount: -amount,
    balanceAfter: broker.cashBalance - amount,
    date: new Date(date),
    externalId: null,
    counterpartyLabel: null,
    createdAt: new Date(),
  });
  broker.cashBalance -= amount;
  commit();
  return ok("Mouvement enregistré");
}

export async function deleteBrokerCashTransaction(id: string) {
  const db = getDB();
  const tx = db.brokerCashTransactions.find((t) => t.id === id);
  if (!tx) return ko("Mouvement introuvable.");
  const broker = db.brokers.find((b) => b.id === tx.brokerId)!;
  if (tx.portfolioTransactionId) return ko("Ce mouvement provient d'un achat/vente : supprime-le depuis le portefeuille concerné.");
  if (broker.cashBalance - tx.amount < -1e-6) return ko("Impossible de supprimer ce mouvement : le cash du courtier deviendrait négatif.");
  db.brokerCashTransactions = db.brokerCashTransactions.filter((t) => t.id !== id);
  recalcBrokerBalance(tx.brokerId);
  commit();
  return ok("Mouvement supprimé");
}

// ── MOUVEMENTS (achat, vente, dépôt, retrait, dividende) ────────

function findPortfolioAsset(portfolioId: string, assetId: string) {
  const db = getDB();
  const portfolio = db.portfolios.find((p) => p.id === portfolioId);
  if (!portfolio) throw new Error("Portefeuille introuvable");
  const asset = db.assets.find((a) => a.id === assetId);
  if (!asset) throw new Error("Titre introuvable");
  return portfolio;
}

export async function addBuyTransaction({
  portfolioId,
  assetId,
  quantity,
  price,
  fees,
  date,
  confirmAutoDeposit = false,
  updatePrice = false,
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
  quantity = assertAmount(quantity);
  price = assertAmount(price);
  fees = assertAmount(fees, { allowZero: true });
  const portfolio = findPortfolioAsset(portfolioId, assetId);

  const cost = quantity * price + fees;
  const shortfall = cost - cashHolderBalance(portfolio);
  if (shortfall > 1e-6 && !confirmAutoDeposit) {
    return ko(`Cash insuffisant : il manque ${shortfall.toFixed(2)} €. Confirme le dépôt automatique pour continuer.`);
  }

  const amount = computeBuyAmount(quantity, price, fees);
  const db = getDB();
  if (shortfall > 1e-6) applyAutoDeposit(portfolio, shortfall, new Date(date));
  const created = newPt(portfolioId, assetId, "BUY", quantity, price, amount, fees, new Date(date));
  db.portfolioTransactions.push(created);
  applyCashEffect(portfolio, "BUY", amount, new Date(date), created.id);
  recalcPosition(portfolioId, assetId);
  if (updatePrice) {
    const asset = db.assets.find((a) => a.id === assetId)!;
    asset.lastPrice = price;
    asset.lastPriceAt = new Date();
  }
  commit();
  return ok("Mouvement enregistré");
}

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
  quantity = assertAmount(quantity);
  price = assertAmount(price);
  fees = assertAmount(fees, { allowZero: true });
  const portfolio = findPortfolioAsset(portfolioId, assetId);
  const db = getDB();
  const position = db.positions.find((p) => p.portfolioId === portfolioId && p.assetId === assetId);
  if (!position || position.quantity < quantity - 1e-6) return ko("Quantité insuffisante dans le portefeuille.");

  const amount = computeSellAmount(quantity, price, fees);
  const created = newPt(portfolioId, assetId, "SELL", quantity, price, amount, fees, new Date(date));
  db.portfolioTransactions.push(created);
  applyCashEffect(portfolio, "SELL", amount, new Date(date), created.id);
  recalcPosition(portfolioId, assetId);
  commit();
  return ok("Mouvement enregistré");
}

export async function addDepositTransaction({ portfolioId, amount, date }: { portfolioId: string; amount: number; date: Date }) {
  amount = assertAmount(amount);
  const db = getDB();
  const portfolio = db.portfolios.find((p) => p.id === portfolioId);
  if (!portfolio) return ko("Portefeuille introuvable.");
  if (!portfolio.hasOwnCash) return ko("Ce portefeuille n'a pas son propre cash — dépose plutôt sur le courtier associé.");
  db.portfolioTransactions.push(newPt(portfolioId, null, "DEPOSIT", null, null, amount, 0, new Date(date)));
  portfolio.cashBalance += amount;
  commit();
  return ok("Mouvement enregistré");
}

export async function addWithdrawalTransaction({ portfolioId, amount, date }: { portfolioId: string; amount: number; date: Date }) {
  amount = assertAmount(amount);
  const db = getDB();
  const portfolio = db.portfolios.find((p) => p.id === portfolioId);
  if (!portfolio) return ko("Portefeuille introuvable.");
  if (!portfolio.hasOwnCash) return ko("Ce portefeuille n'a pas son propre cash — retire plutôt depuis le courtier associé.");
  if (portfolio.cashBalance < amount) return ko("Solde en cash insuffisant.");
  db.portfolioTransactions.push(newPt(portfolioId, null, "WITHDRAWAL", null, null, -amount, 0, new Date(date)));
  portfolio.cashBalance -= amount;
  commit();
  return ok("Mouvement enregistré");
}

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
  amount = assertAmount(amount);
  const portfolio = findPortfolioAsset(portfolioId, assetId);
  const db = getDB();
  const created = newPt(portfolioId, assetId, "DIVIDEND", null, null, amount, 0, new Date(date));
  db.portfolioTransactions.push(created);
  applyCashEffect(portfolio, "DIVIDEND", amount, new Date(date), created.id);
  commit();
  return ok("Mouvement enregistré");
}

export async function deleteTransaction(transactionId: string) {
  const db = getDB();
  const tx = db.portfolioTransactions.find((t) => t.id === transactionId);
  if (!tx) return ko("Mouvement introuvable.");
  const portfolio = db.portfolios.find((p) => p.id === tx.portfolioId)!;
  const broker = portfolio.brokerId ? db.brokers.find((b) => b.id === portfolio.brokerId) : null;
  const holderBalance = portfolio.hasOwnCash ? portfolio.cashBalance : (broker?.cashBalance ?? 0);
  if (holderBalance - tx.amount < -1e-6) return ko("Impossible de supprimer ce mouvement : le cash deviendrait négatif.");

  if (portfolio.hasOwnCash) {
    db.portfolioTransactions = db.portfolioTransactions.filter((t) => t.id !== transactionId);
    recalcPortfolioCashBalance(tx.portfolioId);
  } else if (portfolio.brokerId) {
    db.brokerCashTransactions = db.brokerCashTransactions.filter((t) => t.portfolioTransactionId !== transactionId);
    db.portfolioTransactions = db.portfolioTransactions.filter((t) => t.id !== transactionId);
    recalcBrokerBalance(portfolio.brokerId);
  } else {
    db.portfolioTransactions = db.portfolioTransactions.filter((t) => t.id !== transactionId);
  }
  if (tx.assetId && (tx.type === "BUY" || tx.type === "SELL")) recalcPosition(tx.portfolioId, tx.assetId);
  commit();
  return ok("Mouvement supprimé");
}

// ── IMPORT (désactivé en démo) ──────────────────────────────────

const IMPORT_DISABLED = "L'import de fichiers courtier est désactivé dans la démo. Ajoute tes positions manuellement 🙂";

export async function listSupportedBrokerProviders() {
  return [{ id: "trade-republic", label: "Trade Republic" }];
}
export async function previewBrokerImport(): Promise<never> {
  throw new Error(IMPORT_DISABLED);
}
export async function importBrokerFile(): Promise<never> {
  throw new Error(IMPORT_DISABLED);
}
