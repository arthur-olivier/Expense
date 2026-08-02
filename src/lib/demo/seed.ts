// Jeu de données fictif de la démo. Un profil crédible pour que tous les écrans soient
// remplis (comptes + poches, revenus/dépenses, placements récurrents, portefeuille boursier,
// sauvegardes de simulateur). Reconstruit tel quel à chaque « Réinitialiser ».

import type { DemoDB } from "./store";

const USER = "demo-user";

// Repères de dates relatifs à aujourd'hui
const now = new Date();
const Y = now.getFullYear();
const M = now.getMonth();
const day = (d: number, monthsAgo = 0) => new Date(Y, M - monthsAgo, d, 9, 0, 0);
const monthsAgo = (n: number) => new Date(Y, M - n, 1, 9, 0, 0);
const yearsAgo = (n: number) => new Date(Y - n, M, 1, 9, 0, 0);

export function buildSeed(): DemoDB {
  // ── Comptes d'épargne + poches ────────────────────────────────
  const courant = {
    id: "acc_courant",
    userId: USER,
    name: "Compte courant",
    isLocked: false,
    balance: 3700,
    balanceUpdatedAt: now,
    createdAt: yearsAgo(2),
  };
  const livret = {
    id: "acc_livret",
    userId: USER,
    name: "Livret A",
    isLocked: true,
    balance: 8500,
    balanceUpdatedAt: now,
    createdAt: yearsAgo(2),
  };
  const pel = {
    id: "acc_pel",
    userId: USER,
    name: "PEL",
    isLocked: true,
    balance: 12000,
    balanceUpdatedAt: now,
    createdAt: yearsAgo(3),
  };
  const av = {
    id: "acc_av",
    userId: USER,
    name: "Assurance-vie",
    isLocked: true,
    balance: 9000,
    balanceUpdatedAt: now,
    createdAt: yearsAgo(1),
  };

  const cat = (id: string, accountId: string, name: string, balance: number, createdAt: Date) => ({
    id,
    accountId,
    name,
    balance,
    createdAt,
  });
  // Chaque compte a plusieurs poches : Σ(poches) = solde du compte
  const walletCategories = [
    // Compte courant → 3700
    cat("cat_courant_default", courant.id, "Non catégorisé", 900, courant.createdAt),
    cat("cat_courant_depenses", courant.id, "Dépenses courantes", 800, courant.createdAt),
    cat("cat_courant_precaution", courant.id, "Épargne de précaution", 1200, courant.createdAt),
    cat("cat_courant_vacances", courant.id, "Vacances", 600, courant.createdAt),
    cat("cat_courant_cadeaux", courant.id, "Cadeaux", 200, courant.createdAt),
    // Livret A → 8500
    cat("cat_livret_default", livret.id, "Non catégorisé", 4000, livret.createdAt),
    cat("cat_livret_projets", livret.id, "Projets", 3000, livret.createdAt),
    cat("cat_livret_voiture", livret.id, "Voiture", 1500, livret.createdAt),
    // PEL → 12000
    cat("cat_pel_default", pel.id, "Non catégorisé", 8000, pel.createdAt),
    cat("cat_pel_apport", pel.id, "Apport immobilier", 4000, pel.createdAt),
    // Assurance-vie → 9000
    cat("cat_av_fonds", av.id, "Fonds euros", 6000, av.createdAt),
    cat("cat_av_uc", av.id, "Unités de compte", 3000, av.createdAt),
  ];

  // Mouvements pour l'historique + la courbe du dashboard (versements mensuels)
  let wtId = 1;
  const walletTransactions = [] as DemoDB["walletTransactions"];
  for (let i = 5; i >= 0; i--) {
    walletTransactions.push({
      id: wtId++,
      categoryId: "cat_livret_default",
      investmentId: null,
      label: "Épargne mensuelle",
      amount: 300,
      balanceAfter: 4000 - i * 300,
      date: day(2, i),
      createdAt: day(2, i),
    });
    walletTransactions.push({
      id: wtId++,
      categoryId: "cat_courant_vacances",
      investmentId: null,
      label: "Mise de côté vacances",
      amount: 100,
      balanceAfter: 600 - i * 100,
      date: day(20, i),
      createdAt: day(20, i),
    });
  }
  walletTransactions.push({
    id: wtId++,
    categoryId: "cat_courant_default",
    investmentId: null,
    label: "Solde initial",
    amount: 900,
    balanceAfter: 900,
    date: courant.createdAt,
    createdAt: courant.createdAt,
  });

  // ── Revenus ───────────────────────────────────────────────────
  let incId = 1;
  const incomes = [
    {
      id: incId++,
      userId: USER,
      label: "Salaire",
      amount: 2600,
      date: day(1, 6),
      isRecurring: true,
      dateEndRecurring: null,
    },
    {
      id: incId++,
      userId: USER,
      label: "Prime",
      amount: 800,
      date: day(12),
      isRecurring: false,
      dateEndRecurring: null,
    },
  ];

  // ── Dépenses (category = enum CategoryDepense : 0 Logement … 6 Autre) ──
  let expId = 1;
  const expense = (label: string, amount: number, d: number, category: number, isRecurring: boolean) => ({
    id: expId++,
    userId: USER,
    label,
    amount,
    date: day(d, isRecurring ? 6 : 0),
    isRecurring,
    dateEndRecurring: null,
    category,
  });
  const expenses = [
    expense("Loyer", 950, 5, 0, true),
    expense("Courses", 400, 10, 2, true),
    expense("Transport", 75, 8, 1, true),
    expense("Abonnements", 45, 15, 5, true),
    expense("Restaurant", 60, 18, 4, false),
  ];

  // ── Placements récurrents (versent dans une poche) ────────────
  let invId = 1;
  const investments = [
    {
      id: invId++,
      userId: USER,
      accountId: livret.id,
      categoryId: "cat_livret_default",
      label: "Épargne mensuelle",
      amount: 300,
      date: day(2, 6),
      isRecurring: true,
      dateEndRecurring: null,
      lastGeneratedAt: day(2),
    },
    {
      id: invId++,
      userId: USER,
      accountId: pel.id,
      categoryId: "cat_pel_default",
      label: "Versement PEL",
      amount: 200,
      date: day(3, 6),
      isRecurring: true,
      dateEndRecurring: null,
      lastGeneratedAt: day(3),
    },
  ];

  // ── Portefeuille boursier ─────────────────────────────────────
  const broker = {
    id: "brk_tr",
    userId: USER,
    name: "Trade Republic",
    cashBalance: 150,
    createdAt: yearsAgo(2),
  };

  const pea = {
    id: "pf_pea",
    userId: USER,
    brokerId: null,
    name: "PEA",
    type: "PEA",
    hasOwnCash: true,
    openedAt: yearsAgo(3),
    cashBalance: 500,
    createdAt: yearsAgo(3),
  };
  const cto = {
    id: "pf_cto",
    userId: USER,
    brokerId: broker.id,
    name: "Compte-titres",
    type: "CTO",
    hasOwnCash: false,
    openedAt: yearsAgo(2),
    cashBalance: 0,
    createdAt: yearsAgo(2),
  };

  const world = {
    id: "ast_world",
    userId: USER,
    name: "Amundi MSCI World",
    isin: "LU1681043599",
    ticker: "CW8",
    currency: "EUR",
    lastPrice: 520,
    lastPriceAt: now,
    autoUpdate: false,
  };
  const sp500 = {
    id: "ast_sp500",
    userId: USER,
    name: "iShares S&P 500",
    isin: "IE00B5BMR087",
    ticker: "CSPX",
    currency: "EUR",
    lastPrice: 610,
    lastPriceAt: now,
    autoUpdate: false,
  };
  const assets = [world, sp500];

  // Positions cohérentes avec les achats ci-dessous (PRU = coût moyen)
  const positions = [
    { id: "pos_pea_world", portfolioId: pea.id, assetId: world.id, quantity: 12, pru: 430, updatedAt: now },
    { id: "pos_cto_sp500", portfolioId: cto.id, assetId: sp500.id, quantity: 5, pru: 550, updatedAt: now },
  ];

  let ptId = 1;
  const portfolioTransactions = [
    {
      id: `pt_${ptId++}`,
      portfolioId: pea.id,
      assetId: world.id,
      type: "BUY",
      quantity: 12,
      price: 430,
      amount: -(12 * 430),
      fees: 0,
      date: yearsAgo(2),
      externalId: null,
      counterpartyLabel: null,
      createdAt: yearsAgo(2),
    },
    {
      id: `pt_${ptId++}`,
      portfolioId: cto.id,
      assetId: sp500.id,
      type: "BUY",
      quantity: 5,
      price: 550,
      amount: -(5 * 550),
      fees: 0,
      date: monthsAgo(8),
      externalId: null,
      counterpartyLabel: null,
      createdAt: monthsAgo(8),
    },
  ];

  const brokerCashTransactions = [
    {
      id: "bct_1",
      brokerId: broker.id,
      portfolioId: cto.id,
      portfolioTransactionId: null,
      type: "DEPOSIT",
      amount: 2900,
      balanceAfter: 2900,
      date: monthsAgo(9),
      externalId: null,
      counterpartyLabel: null,
      createdAt: monthsAgo(9),
    },
    {
      id: "bct_2",
      brokerId: broker.id,
      portfolioId: cto.id,
      portfolioTransactionId: "pt_2",
      type: "BUY",
      amount: -(5 * 550),
      balanceAfter: 150,
      date: monthsAgo(8),
      externalId: null,
      counterpartyLabel: null,
      createdAt: monthsAgo(8),
    },
  ];

  // ── Sauvegardes de simulateur ─────────────────────────────────
  const simulationSaves = [
    {
      id: "sim_1",
      userId: USER,
      type: "projection",
      name: "Objectif liberté",
      depart: 20000,
      mensuel: 500,
      objectif: 0,
      duree: 20,
      taux: 7,
      createdAt: monthsAgo(1),
      updatedAt: monthsAgo(1),
    },
  ];

  return {
    financialAccounts: [courant, livret, pel, av],
    walletCategories,
    walletTransactions,
    incomes,
    expenses,
    investments,
    portfolios: [pea, cto],
    assets,
    positions,
    portfolioTransactions,
    brokers: [broker],
    brokerCashTransactions,
    simulationSaves,
  };
}
