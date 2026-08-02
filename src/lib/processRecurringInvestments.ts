import { prisma } from "@/lib/prisma";
import type { Investments, Prisma } from "@/app/generated/prisma/client";

//-------- Génère les transactions des investissements récurrents et met à jour les soldes ------

// génère les versements manquants d'un placement dans le tx fourni (permet d'enchaîner avec d'autres écritures, atomique)
export async function generateInvestmentTransactions(
  tx: Prisma.TransactionClient,
  investment: Investments,
): Promise<void> {
  if (!investment.categoryId) return;

  const now = new Date();

  // Point de départ : le mois suivant la dernière génération, ou la date de création
  const cursor = investment.lastGeneratedAt ? addOneMonth(investment.lastGeneratedAt) : new Date(investment.date);

  // Liste des dates à générer, mois par mois, jusqu'à aujourd'hui
  const datesToGenerate: Date[] = [];
  let current = new Date(cursor);

  while (current <= now) {
    if (investment.dateEndRecurring && current > investment.dateEndRecurring) break;
    datesToGenerate.push(new Date(current));
    if (!investment.isRecurring) break; // ponctuel = une seule date
    current = addOneMonth(current);
  }

  if (datesToGenerate.length === 0) return;

  const categoryId = investment.categoryId;

  // Solde lu dans le `tx` pour refléter d'éventuelles écritures déjà faites dans la transaction
  const account = await tx.financialAccount.findUniqueOrThrow({
    where: { id: investment.accountId },
    select: { balance: true },
  });

  // Une transaction par date, en recalculant le solde courant à chaque fois
  let runningBalance = account.balance;
  for (const txDate of datesToGenerate) {
    runningBalance += investment.amount;
    await tx.walletTransaction.create({
      data: {
        categoryId,
        investmentId: investment.id,
        label: investment.label,
        amount: investment.amount,
        date: txDate,
        balanceAfter: runningBalance,
      },
    });
  }

  const totalAmount = investment.amount * datesToGenerate.length;

  // Met à jour le solde de la poche puis du compte
  await tx.walletCategory.update({
    where: { id: categoryId },
    data: { balance: { increment: totalAmount } },
  });
  await tx.financialAccount.update({
    where: { id: investment.accountId },
    data: { balance: { increment: totalAmount }, balanceUpdatedAt: new Date() },
  });

  // Mémorise la dernière date générée pour ne pas la refaire au prochain passage
  await tx.investments.update({
    where: { id: investment.id },
    data: { lastGeneratedAt: datesToGenerate[datesToGenerate.length - 1] },
  });
}

// Version autonome (ouvre sa propre transaction), utilisée par le traitement quotidien
export async function processInvestment(investment: Investments): Promise<void> {
  await prisma.$transaction((tx) => generateInvestmentTransactions(tx, investment));
}

// Traite tous les investissements récurrents d'un utilisateur (une fois par jour max)
export async function processRecurringInvestments(userId: string): Promise<void> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Réserve le traitement du jour de façon atomique (verrou contre deux exécutions parallèles)
  const claim = await prisma.user.updateMany({
    where: {
      id: userId,
      OR: [{ lastProcessedAt: null }, { lastProcessedAt: { lt: startOfToday } }],
    },
    data: { lastProcessedAt: now },
  });
  if (claim.count === 0) return; // déjà traité aujourd'hui

  const investments = await prisma.investments.findMany({
    where: { userId, isRecurring: true, date: { lte: now } },
  });

  // Chaque placement dans sa propre transaction : un placement invalide n'annule pas les autres
  for (const investment of investments) {
    try {
      await processInvestment(investment);
    } catch {
      // Ignorer les investissements invalides
    }
  }
}

// Ajoute un mois à une date, en gérant les fins de mois (ex: 31 janv → 28/29 févr)
function addOneMonth(date: Date): Date {
  const day = date.getDate();
  const next = new Date(date);
  next.setMonth(next.getMonth() + 1);
  if (next.getDate() !== day) next.setDate(0);
  return next;
}
