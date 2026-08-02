"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#a855f7", "#ef4444", "#84cc16"];

//renvoie les deux bornes de dates du mois
function getMonthRange(year: number, month: number) {
  return {
    startOfMonth: new Date(year, month, 1),
    endOfMonth: new Date(year, month + 1, 1),
  };
}

//filtre Prisma des transactions d'un mois : datées dans le mois ou récurrentes encore actives
function monthFilter(startOfMonth: Date, endOfMonth: Date) {
  return {
    OR: [
      { date: { gte: startOfMonth, lt: endOfMonth } },
      {
        isRecurring: true,
        date: { lt: endOfMonth },
        OR: [{ dateEndRecurring: null }, { dateEndRecurring: { gte: startOfMonth } }],
      },
    ],
  };
}

function evolutionPct(current: number, previous: number) {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export async function getDashboardData() {
  const user = await getAuthenticatedUser();

  //recuperation de la date
  const today = new Date();
  const currentDay = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth();

  const { startOfMonth, endOfMonth } = getMonthRange(year, month);
  //filtre pour selectionner les transactions dans ce mois
  const currentFilter = monthFilter(startOfMonth, endOfMonth);

  //recuperation des donnees du mois d'avant
  const prevDate = new Date(year, month - 1, 1);
  const { startOfMonth: prevStart, endOfMonth: prevEnd } = getMonthRange(prevDate.getFullYear(), prevDate.getMonth());
  const prevFilter = monthFilter(prevStart, prevEnd);

  //Construction de la liste des 6 derniers mois
  const monthsCount = 6;
  const months: { year: number; month: number; label: string }[] = [];
  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    months.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleString("fr-FR", { month: "short" }),
    });
  }
  const rangeStart = new Date(months[0].year, months[0].month, 1);

  // Toutes les requêtes lancées en parallèle (plus rapide qu'une par une)
  const [
    depenses,
    depensesMoisPrecedent,
    revenus,
    revenusMoisPrecedent,
    investments,
    investmentsMoisPrecedent,
    accounts,
    activeInvestments,
    transactionsInRange,
    portfolios,
  ] = await Promise.all([
    prisma.expenses.findMany({
      where: { userId: user.id, ...currentFilter },
      orderBy: { date: "asc" },
    }),
    prisma.expenses.findMany({ where: { userId: user.id, ...prevFilter } }),
    prisma.incomes.findMany({ where: { userId: user.id, ...currentFilter } }),
    prisma.incomes.findMany({ where: { userId: user.id, ...prevFilter } }),
    // Placements du mois : on inclut le compte pour l'afficher en sous-titre de l'échéancier
    prisma.investments.findMany({
      where: { userId: user.id, ...currentFilter },
      include: { account: true },
      orderBy: { date: "asc" },
    }),
    prisma.investments.findMany({ where: { userId: user.id, ...prevFilter } }),
    prisma.financialAccount.findMany({
      where: { userId: user.id },
      include: { categories: true },
      orderBy: { balance: "desc" },
    }),
    // Investissements récurrents encore actifs aujourd'hui
    prisma.investments.findMany({
      where: {
        userId: user.id,
        isRecurring: true,
        OR: [{ dateEndRecurring: null }, { dateEndRecurring: { gte: today } }],
      },
      include: { account: true },
      orderBy: { amount: "desc" },
    }),
    // Transactions sur les 6 mois (pour le graphe d'évolution)
    prisma.walletTransaction.findMany({
      where: { category: { account: { userId: user.id } }, date: { gte: rangeStart } },
      select: { amount: true, date: true },
    }),
    prisma.portfolio.findMany({
      where: { userId: user.id },
      include: { positions: { include: { asset: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // Totaux du mois courant
  const totalDepenses = depenses.reduce((sum, d) => sum + d.amount, 0);
  const totalRevenus = revenus.reduce((sum, r) => sum + r.amount, 0);
  const totalInvestments = investments.reduce((sum, i) => sum + i.amount, 0);

  // Totaux du mois précédent (pour comparer)
  const totalDepensesPrecedent = depensesMoisPrecedent.reduce((sum, d) => sum + d.amount, 0);
  const totalRevenusPrecedent = revenusMoisPrecedent.reduce((sum, r) => sum + r.amount, 0);
  const totalInvestmentsPrecedent = investmentsMoisPrecedent.reduce((sum, i) => sum + i.amount, 0);

  // Ce qu'il reste une fois dépenses et investissements retirés
  const resteFinDuMois = totalRevenus - totalDepenses - totalInvestments;
  // idem mois précédent, pour l'évolution du reste en tête de tableau
  const restePrecedent = totalRevenusPrecedent - totalDepensesPrecedent - totalInvestmentsPrecedent;
  const evolutionReste = evolutionPct(resteFinDuMois, restePrecedent);

  // Dépenses regroupées par catégorie : { idCatégorie: montant total }
  const depensesParCategorie = depenses.reduce<Record<number, number>>((acc, d) => {
    acc[d.category] = (acc[d.category] ?? 0) + d.amount;
    return acc;
  }, {});

  // Ce qui reste à prélever d'ici la fin du mois (dates après aujourd'hui)
  const depensesRestantes = depenses.filter((d) => d.date.getDate() > currentDay);
  const investmentsRestants = investments.filter((i) => i.date.getDate() > currentDay);
  const totalDepensesRestantes = depensesRestantes.reduce((sum, d) => sum + d.amount, 0);
  const totalInvestmentsRestants = investmentsRestants.reduce((sum, i) => sum + i.amount, 0);
  const totalAPrelever = totalDepensesRestantes + totalInvestmentsRestants;

  // Répartition du cash : total, bloqué, et disponible
  const totalComptes = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalLocked = accounts.filter((a) => a.isLocked).reduce((sum, a) => sum + a.balance, 0);
  const totalLiquide = totalComptes - totalLocked;

  // Valeur de chaque portefeuille = positions (quantité × cours) + liquidités
  const portfolioValues = portfolios.map((p) => {
    const valeurPositions = p.positions.reduce((sum, pos) => sum + pos.quantity * (pos.asset.lastPrice ?? 0), 0);
    return { name: p.name, value: valeurPositions + p.cashBalance };
  });
  const totalPatrimoineBoursier = portfolioValues.reduce((sum, p) => sum + p.value, 0);

  // Patrimoine total = comptes + bourse
  const totalPatrimoine = totalComptes + totalPatrimoineBoursier;

  // Parts du camembert : un secteur par compte, puis un par portefeuille
  const accountSlices = [
    ...accounts.map((a, i) => ({
      label: a.name,
      value: a.balance,
      color: PALETTE[i % PALETTE.length],
      isLocked: a.isLocked,
    })),
    ...portfolioValues.map((p, i) => ({
      label: p.name,
      value: p.value,
      color: PALETTE[(accounts.length + i) % PALETTE.length],
      isLocked: false,
    })),
  ];

  // Camembert par catégorie (soldes positifs uniquement, triés du + grand au + petit)
  const categorySlices = accounts
    .flatMap((a) => a.categories.map((c) => ({ ...c, accountName: a.name })))
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .map((c, i) => ({
      label: c.name,
      value: c.balance,
      color: PALETTE[i % PALETTE.length],
    }));

  const totalRecurringMonthly = activeInvestments.reduce((sum, inv) => sum + inv.amount, 0);

  // Flux net (entrées - sorties) pour chacun des 6 mois
  const netFlowPerMonth = months.map(({ year, month }) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    return transactionsInRange.filter((t) => t.date >= start && t.date < end).reduce((sum, t) => sum + t.amount, 0);
  });
  const totalFlowInRange = netFlowPerMonth.reduce((sum, v) => sum + v, 0);

  // patrimoine mois par mois : solde d'il y a 6 mois + flux de chaque mois
  let running = totalComptes - totalFlowInRange;
  const patrimoineEvolution = months.map((m, i) => {
    running += netFlowPerMonth[i];
    return { label: m.label, balance: running + totalPatrimoineBoursier };
  });

  return {
    totalDepenses,
    totalRevenus,
    totalInvestments,
    resteFinDuMois,
    evolutionReste,
    depensesParCategorie,
    depensesRestantes,
    investmentsRestants,
    totalAPrelever,
    totalPatrimoine,
    totalLocked,
    totalLiquide,
    totalPatrimoineBoursier,
    accountSlices,
    categorySlices,
    activeInvestments,
    totalRecurringMonthly,
    patrimoineEvolution,
  };
}
