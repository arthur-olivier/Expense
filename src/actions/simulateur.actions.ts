"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

export interface PatrimoineCategory {
  id: string;
  name: string;
  balance: number;
}

export interface PatrimoineAccount {
  id: string;
  name: string;
  balance: number;
  categories: PatrimoineCategory[];
}

export interface PatrimoineBreakdown {
  totalPatrimoine: number;
  accounts: PatrimoineAccount[];
}

export async function getPatrimoineBreakdown(): Promise<PatrimoineBreakdown> {
  const user = await getAuthenticatedUser();

  const accounts = await prisma.financialAccount.findMany({
    where: { userId: user.id },
    include: { categories: { select: { id: true, name: true, balance: true } } },
    orderBy: { createdAt: "asc" },
  });

  const totalPatrimoine = accounts.reduce((sum, a) => sum + a.balance, 0);

  return {
    totalPatrimoine,
    accounts: accounts.map((a) => ({
      id: a.id,
      name: a.name,
      balance: a.balance,
      categories: a.categories,
    })),
  };
}

// ─────────────────────────────────────────────────────────────
// Sauvegardes de simulation (onglet Mes sauvegardes)
// ─────────────────────────────────────────────────────────────

export type SimulationType = "projection" | "objectif";

// params communs aux deux types de simulation (seuls les utiles au type comptent)
export interface SimulationParams {
  depart: number;
  mensuel: number;
  objectif: number;
  duree: number;
  taux: number;
}

// une sauvegarde renvoyée au client
export interface SimulationSaveRecord extends SimulationParams {
  id: string;
  type: SimulationType;
  name: string;
  updatedAt: Date;
}

interface SimulationSaveInput {
  type: SimulationType;
  name: string;
  params: SimulationParams;
}

// sauvegardes de l'utilisateur, la plus récente d'abord
export async function getSimulationSaves(): Promise<SimulationSaveRecord[]> {
  const user = await getAuthenticatedUser();
  const saves = await prisma.simulationSave.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  return saves.map((s) => ({
    id: s.id,
    type: s.type as SimulationType,
    name: s.name,
    depart: s.depart,
    mensuel: s.mensuel,
    objectif: s.objectif,
    duree: s.duree,
    taux: s.taux,
    updatedAt: s.updatedAt,
  }));
}

// crée une sauvegarde depuis les params courants d'un onglet
export async function createSimulationSave({ type, name, params }: SimulationSaveInput): Promise<SimulationSaveRecord> {
  const user = await getAuthenticatedUser();
  const save = await prisma.simulationSave.create({
    data: { userId: user.id, type, name: name.trim(), ...params },
  });
  return { ...params, id: save.id, type, name: save.name, updatedAt: save.updatedAt };
}

// maj d'une sauvegarde (nom + params) après vérif de propriété
export async function updateSimulationSave(
  id: string,
  { name, params }: Omit<SimulationSaveInput, "type">,
): Promise<SimulationSaveRecord> {
  const user = await getAuthenticatedUser();
  const existing = await prisma.simulationSave.findFirst({ where: { id, userId: user.id } });
  if (!existing) throw new Error("Sauvegarde introuvable");
  const save = await prisma.simulationSave.update({
    where: { id },
    data: { name: name.trim(), ...params },
  });
  return {
    ...params,
    id: save.id,
    type: save.type as SimulationType,
    name: save.name,
    updatedAt: save.updatedAt,
  };
}

// supprime une sauvegarde
export async function deleteSimulationSave(id: string): Promise<void> {
  const user = await getAuthenticatedUser();
  await prisma.simulationSave.deleteMany({ where: { id, userId: user.id } });
}

export async function getSimulateurSeedData() {
  const user = await getAuthenticatedUser();
  const today = new Date();

  const [accounts, activeInvestments] = await Promise.all([
    prisma.financialAccount.findMany({ where: { userId: user.id } }),
    prisma.investments.findMany({
      where: {
        userId: user.id,
        isRecurring: true,
        OR: [{ dateEndRecurring: null }, { dateEndRecurring: { gte: today } }],
      },
    }),
  ]);

  const totalPatrimoine = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalRecurringMonthly = activeInvestments.reduce((sum, i) => sum + i.amount, 0);

  return { totalPatrimoine, totalRecurringMonthly };
}
