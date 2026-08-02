// Store en mémoire du mode démo : les mêmes tables que la base, mais côté navigateur.
// Persisté en sessionStorage → survit à un rafraîchissement, disparaît à la fermeture de
// l'onglet. En dehors du navigateur (tests Node), tout reste en mémoire.

import type {
  FinancialAccount,
  WalletCategory,
  WalletTransaction,
  Incomes,
  Expenses,
  Investments,
  Portfolio,
  Asset,
  Position,
  PortfolioTransaction,
  Broker,
  BrokerCashTransaction,
  SimulationSave,
} from "@/app/generated/prisma/client";
import { buildSeed } from "./seed";

export type DemoDB = {
  financialAccounts: FinancialAccount[];
  walletCategories: WalletCategory[];
  walletTransactions: WalletTransaction[];
  incomes: Incomes[];
  expenses: Expenses[];
  investments: Investments[];
  portfolios: Portfolio[];
  assets: Asset[];
  positions: Position[];
  portfolioTransactions: PortfolioTransaction[];
  brokers: Broker[];
  brokerCashTransactions: BrokerCashTransaction[];
  simulationSaves: SimulationSave[];
};

const STORAGE_KEY = "expense-demo-db";

// Détecte une date ISO pour la reconvertir en objet Date après un JSON.parse
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
function reviveDates(_key: string, value: unknown) {
  return typeof value === "string" && ISO_DATE.test(value) ? new Date(value) : value;
}

let db: DemoDB | null = null;

function load(): DemoDB {
  if (typeof window !== "undefined") {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw, reviveDates) as DemoDB;
      } catch {
        // sessionStorage corrompu : on repart du seed
      }
    }
  }
  return buildSeed();
}

// Accès au store (chargé/seedé au premier appel)
export function getDB(): DemoDB {
  if (!db) db = load();
  return db;
}

// À appeler après chaque mutation pour persister l'état
export function commit(): void {
  if (typeof window !== "undefined" && db) {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
}

// Remet la démo à son état initial (bouton « Réinitialiser »)
export function resetDemo(): void {
  db = buildSeed();
  commit();
}

// Génère un identifiant unique façon cuid (suffisant pour la démo)
export function demoId(prefix = "c"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

// Compteur d'auto-incrément pour les tables à id numérique (incomes, expenses, investments…)
export function nextIntId(rows: { id: number }[]): number {
  return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
}
