"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";
import { assertAmount } from "@/lib/validation";
import { fail, type ActionResult } from "@/lib/actionResult";
import type { Revenu } from "@/types/finance";

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

export async function addRevenu(data: Omit<Revenu, "id" | "userId">): Promise<ActionResult<Revenu>> {
  try {
    const user = await getAuthenticatedUser();
    const revenu = await prisma.incomes.create({
      data: {
        userId: user.id,
        label: data.label,
        amount: assertAmount(data.amount),
        date: new Date(data.date),
        isRecurring: data.isRecurring,
        dateEndRecurring: data.isRecurring ? (data.dateEndRecurring ?? null) : null,
      },
    });
    revalidatePath("/charges");
    return { success: true, message: "Revenu ajouté", data: revenu };
  } catch (err) {
    return fail("addRevenu", err, "Impossible d'ajouter le revenu.");
  }
}

// ─────────────────────────────────────────────────────────────
// GET
// ─────────────────────────────────────────────────────────────

export async function getRevenusByMonth(year: number, month: number) {
  const user = await getAuthenticatedUser();
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 1);

  return prisma.incomes.findMany({
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

export async function updateRevenu(id: number, data: Omit<Revenu, "id" | "userId">): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();
    await prisma.incomes.update({
      where: { id, userId: user.id },
      data: {
        label: data.label,
        amount: assertAmount(data.amount),
        date: new Date(data.date),
        isRecurring: data.isRecurring,
        dateEndRecurring: data.isRecurring ? (data.dateEndRecurring ?? null) : null,
      },
    });
    revalidatePath("/charges");
    return { success: true, message: "Revenu modifié" };
  } catch (err) {
    return fail("updateRevenu", err, "Impossible de modifier le revenu.");
  }
}

// ─────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────

export async function deleteRevenu(id: number): Promise<ActionResult> {
  try {
    const user = await getAuthenticatedUser();
    const revenu = await prisma.incomes.findFirst({ where: { id, userId: user.id } });
    if (!revenu) return { success: false, message: "Revenu introuvable" };

    const startOfCurrentMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    if (revenu.isRecurring && revenu.date < startOfCurrentMonth) {
      const endOfLastMonth = new Date(startOfCurrentMonth);
      endOfLastMonth.setDate(0); // dernier jour du mois précédent
      await prisma.incomes.update({
        where: { id },
        data: { dateEndRecurring: endOfLastMonth },
      });
      revalidatePath("/charges");
      return { success: true, message: "Récurrence arrêtée à partir de ce mois" };
    }

    await prisma.incomes.delete({ where: { id } });
    revalidatePath("/charges");
    return { success: true, message: "Revenu supprimé" };
  } catch (err) {
    return fail("deleteRevenu", err, "Impossible de supprimer le revenu.");
  }
}
