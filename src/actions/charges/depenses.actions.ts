"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { assertAmount } from "@/lib/validation";
import { fail, type ActionResult } from "@/lib/actionResult";
import type { Depense } from "@/types/finance";

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

export async function addDepense(data: Omit<Depense, "id" | "userId">): Promise<ActionResult<Depense>> {
  try {
    const user = await getAuthenticatedUser();
    const depense = await prisma.expenses.create({
      data: {
        userId: user.id,
        label: data.label,
        amount: assertAmount(data.amount),
        date: new Date(data.date),
        isRecurring: data.isRecurring,
        dateEndRecurring: data.isRecurring ? (data.dateEndRecurring ?? null) : null,
        category: data.category,
      },
    });
    revalidatePath("/charges");
    return { success: true, message: "Dépense ajoutée", data: depense };
  } catch (err) {
    return fail("addDepense", err, "Impossible d'ajouter la dépense.");
  }
}

// ─────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────

export async function getDepensesByMonth(year: number, month: number) {
  const user = await getAuthenticatedUser();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 1);

  return prisma.expenses.findMany({
    where: {
      userId: user.id,
      OR: [
        { date: { gte: startOfMonth, lt: endOfMonth } },
        {
          isRecurring: true,
          date: { lt: endOfMonth },
          OR: [{ dateEndRecurring: null }, { dateEndRecurring: { gte: startOfMonth } }],
        },
      ],
    },
    orderBy: { date: "asc" },
  });
}

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

export async function updateDepense(id: number, data: Omit<Depense, "id" | "userId">): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();
    await prisma.expenses.update({
      where: { id, userId: user.id },
      data: {
        label: data.label,
        amount: assertAmount(data.amount),
        date: new Date(data.date),
        isRecurring: data.isRecurring,
        dateEndRecurring: data.isRecurring ? (data.dateEndRecurring ?? null) : null,
        category: data.category,
      },
    });
    revalidatePath("/charges");
    return { success: true, message: "Dépense modifiée" };
  } catch (err) {
    return fail("updateDepense", err, "Impossible de modifier la dépense.");
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────

export async function deleteDepense(id: number): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();
    const depense = await prisma.expenses.findFirst({ where: { id, userId: user.id } });
    if (!depense) return { success: false, message: "Dépense introuvable" };

    const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    if (depense.isRecurring && depense.date < startOfCurrentMonth) {
      const endOfLastMonth = new Date(startOfCurrentMonth);
      endOfLastMonth.setDate(0);
      await prisma.expenses.update({
        where: { id },
        data: { dateEndRecurring: endOfLastMonth },
      });
      revalidatePath("/charges");
      return { success: true, message: "Récurrence arrêtée à partir de ce mois" };
    }

    await prisma.expenses.delete({ where: { id } });
    revalidatePath("/charges");
    return { success: true, message: "Dépense supprimée" };
  } catch (err) {
    return fail("deleteDepense", err, "Impossible de supprimer la dépense.");
  }
}
