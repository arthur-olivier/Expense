"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export type ExportScope = "month" | "year" | "all";

function buildExportWhere(userId: string, scope: ExportScope, year: number, month: number) {
  if (scope === "month") {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    return {
      userId,
      OR: [
        { date: { gte: start, lt: end } },
        {
          isRecurring: true,
          date: { lt: end },
          OR: [{ dateEndRecurring: null }, { dateEndRecurring: { gte: start } }],
        },
      ],
    };
  }
  if (scope === "year") {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return {
      userId,
      OR: [
        { date: { gte: start, lt: end } },
        {
          isRecurring: true,
          date: { lt: end },
          OR: [{ dateEndRecurring: null }, { dateEndRecurring: { gte: start } }],
        },
      ],
    };
  }
  return { userId };
}

export async function getExportData(scope: ExportScope, year: number, month: number) {
  const user = await getAuthenticatedUser();
  const where = buildExportWhere(user.id, scope, year, month);

  const [revenus, depenses, investments] = await Promise.all([
    prisma.incomes.findMany({ where, orderBy: { date: "asc" } }),
    prisma.expenses.findMany({ where, orderBy: { date: "asc" } }),
    prisma.investments.findMany({
      where,
      include: { account: true, category: true },
      orderBy: { date: "asc" },
    }),
  ]);

  return { revenus, depenses, investments };
}
