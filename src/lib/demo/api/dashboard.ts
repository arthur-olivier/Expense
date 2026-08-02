// API démo du tableau de bord : reprend la logique d'agrégation de dashboard.actions.ts,
// mais lit le store en mémoire au lieu de la base. Forme de retour identique.

import { getDB } from "@/lib/demo/store";

const PALETTE = ["#6366f1", "#22c55e", "#f59e0b", "#ec4899", "#06b6d4", "#a855f7", "#ef4444", "#84cc16"];

function inMonth(r: { date: Date; isRecurring: boolean; dateEndRecurring: Date | null }, start: Date, end: Date) {
  const dated = r.date >= start && r.date < end;
  const recurring = r.isRecurring && r.date < end && (!r.dateEndRecurring || r.dateEndRecurring >= start);
  return dated || recurring;
}
function evolutionPct(current: number, previous: number) {
  return previous > 0 ? ((current - previous) / previous) * 100 : null;
}

export async function getDashboardData() {
  const db = getDB();
  const today = new Date();
  const currentDay = today.getDate();
  const year = today.getFullYear();
  const month = today.getMonth();

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const prevStart = new Date(year, month - 1, 1);
  const prevEnd = new Date(year, month, 1);

  const months: { year: number; month: number; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(year, month - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleString("fr-FR", { month: "short" }) });
  }
  const rangeStart = new Date(months[0].year, months[0].month, 1);

  const depenses = db.expenses.filter((e) => inMonth(e, start, end)).sort((a, b) => a.date.getTime() - b.date.getTime());
  const depensesMoisPrecedent = db.expenses.filter((e) => inMonth(e, prevStart, prevEnd));
  const revenus = db.incomes.filter((r) => inMonth(r, start, end));
  const revenusMoisPrecedent = db.incomes.filter((r) => inMonth(r, prevStart, prevEnd));
  const investments = db.investments
    .filter((i) => inMonth(i, start, end))
    .map((i) => ({ ...i, account: db.financialAccounts.find((a) => a.id === i.accountId)! }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  const investmentsMoisPrecedent = db.investments.filter((i) => inMonth(i, prevStart, prevEnd));

  const accounts = db.financialAccounts
    .map((a) => ({ ...a, categories: db.walletCategories.filter((c) => c.accountId === a.id) }))
    .sort((a, b) => b.balance - a.balance);

  const activeInvestments = db.investments
    .filter((i) => i.isRecurring && (!i.dateEndRecurring || i.dateEndRecurring >= today))
    .map((i) => ({ ...i, account: db.financialAccounts.find((a) => a.id === i.accountId)! }))
    .sort((a, b) => b.amount - a.amount);

  const transactionsInRange = db.walletTransactions.filter((t) => t.date >= rangeStart);

  const portfolios = db.portfolios
    .map((p) => ({ ...p, positions: db.positions.filter((pos) => pos.portfolioId === p.id).map((pos) => ({ ...pos, asset: db.assets.find((a) => a.id === pos.assetId)! })) }))
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const totalDepenses = depenses.reduce((s, d) => s + d.amount, 0);
  const totalRevenus = revenus.reduce((s, r) => s + r.amount, 0);
  const totalInvestments = investments.reduce((s, i) => s + i.amount, 0);
  const totalDepensesPrecedent = depensesMoisPrecedent.reduce((s, d) => s + d.amount, 0);
  const totalRevenusPrecedent = revenusMoisPrecedent.reduce((s, r) => s + r.amount, 0);
  const totalInvestmentsPrecedent = investmentsMoisPrecedent.reduce((s, i) => s + i.amount, 0);

  const resteFinDuMois = totalRevenus - totalDepenses - totalInvestments;
  const restePrecedent = totalRevenusPrecedent - totalDepensesPrecedent - totalInvestmentsPrecedent;
  const evolutionReste = evolutionPct(resteFinDuMois, restePrecedent);

  const depensesParCategorie = depenses.reduce<Record<number, number>>((acc, d) => {
    acc[d.category] = (acc[d.category] ?? 0) + d.amount;
    return acc;
  }, {});

  const depensesRestantes = depenses.filter((d) => d.date.getDate() > currentDay);
  const investmentsRestants = investments.filter((i) => i.date.getDate() > currentDay);
  const totalAPrelever =
    depensesRestantes.reduce((s, d) => s + d.amount, 0) + investmentsRestants.reduce((s, i) => s + i.amount, 0);

  const totalComptes = accounts.reduce((s, a) => s + a.balance, 0);
  const totalLocked = accounts.filter((a) => a.isLocked).reduce((s, a) => s + a.balance, 0);
  const totalLiquide = totalComptes - totalLocked;

  const portfolioValues = portfolios.map((p) => {
    const valeurPositions = p.positions.reduce((s, pos) => s + pos.quantity * (pos.asset.lastPrice ?? 0), 0);
    return { id: p.id, name: p.name, value: valeurPositions + p.cashBalance };
  });
  const totalPatrimoineBoursier = portfolioValues.reduce((s, p) => s + p.value, 0);
  const totalPatrimoine = totalComptes + totalPatrimoineBoursier;

  const accountSlices = [
    ...accounts.map((a, i) => ({ id: a.id, label: a.name, value: a.balance, color: PALETTE[i % PALETTE.length], isLocked: a.isLocked })),
    ...portfolioValues.map((p, i) => ({ id: p.id, label: p.name, value: p.value, color: PALETTE[(accounts.length + i) % PALETTE.length], isLocked: false })),
  ];

  const categorySlices = accounts
    .flatMap((a) => a.categories.map((c) => ({ ...c, accountName: a.name })))
    .filter((c) => c.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .map((c, i) => ({ id: c.id, label: c.name, value: c.balance, color: PALETTE[i % PALETTE.length] }));

  const totalRecurringMonthly = activeInvestments.reduce((s, inv) => s + inv.amount, 0);

  const netFlowPerMonth = months.map(({ year, month }) => {
    const s = new Date(year, month, 1);
    const e = new Date(year, month + 1, 1);
    return transactionsInRange.filter((t) => t.date >= s && t.date < e).reduce((sum, t) => sum + t.amount, 0);
  });
  const totalFlowInRange = netFlowPerMonth.reduce((s, v) => s + v, 0);

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
