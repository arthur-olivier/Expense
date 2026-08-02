"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export type TransactionExportScope = "month" | "year" | "all";

function getDateRangeForScope(scope: TransactionExportScope) {
  const now = new Date();
  if (scope === "month") {
    return { start: new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()), end: now };
  }
  if (scope === "year") {
    return { start: new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()), end: now };
  }
  return { start: new Date(2000, 0, 1), end: now };
}

export async function getWalletsTransactionsForExport(
  scope: TransactionExportScope,
  accountId?: string,
) {
  const user = await getAuthenticatedUser();
  const { start, end } = getDateRangeForScope(scope);

  const accounts = await prisma.financialAccount.findMany({
    where: {
      userId: user.id,
      ...(accountId ? { id: accountId } : {}),
    },
    orderBy: { createdAt: "asc" },
  });

  const result = [];
  for (const account of accounts) {
    const transactions = await prisma.walletTransaction.findMany({
      where: {
        category: { accountId: account.id },
        date: { gte: start, lte: end },
      },
      include: { category: true },
      orderBy: { date: "desc" },
    });
    result.push({ accountId: account.id, accountName: account.name, transactions });
  }
  return result;
}
