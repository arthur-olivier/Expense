// API démo du simulateur : patrimoine par compte/poche + sauvegardes de simulation.
// Miroir de simulateur.actions.ts sur le store.

import { getDB, commit, demoId } from "@/lib/demo/store";

const USER = "demo-user";

export type SimulationType = "projection" | "objectif";
export interface SimulationParams {
  depart: number;
  mensuel: number;
  objectif: number;
  duree: number;
  taux: number;
}
export interface SimulationSaveRecord extends SimulationParams {
  id: string;
  type: SimulationType;
  name: string;
  updatedAt: Date;
}

export async function getPatrimoineBreakdown() {
  const db = getDB();
  const accounts = db.financialAccounts
    .slice()
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((a) => ({
      id: a.id,
      name: a.name,
      balance: a.balance,
      categories: db.walletCategories
        .filter((c) => c.accountId === a.id)
        .map((c) => ({ id: c.id, name: c.name, balance: c.balance })),
    }));
  return { totalPatrimoine: accounts.reduce((s, a) => s + a.balance, 0), accounts };
}

export async function getSimulationSaves(): Promise<SimulationSaveRecord[]> {
  return getDB()
    .simulationSaves.slice()
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .map((s) => ({
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

export async function createSimulationSave({
  type,
  name,
  params,
}: {
  type: SimulationType;
  name: string;
  params: SimulationParams;
}): Promise<SimulationSaveRecord> {
  const db = getDB();
  const now = new Date();
  const save = {
    id: demoId("sim"),
    userId: USER,
    type,
    name: name.trim(),
    ...params,
    createdAt: now,
    updatedAt: now,
  };
  db.simulationSaves.push(save);
  commit();
  return { ...params, id: save.id, type, name: save.name, updatedAt: save.updatedAt };
}

export async function updateSimulationSave(
  id: string,
  { name, params }: { name: string; params: SimulationParams },
): Promise<SimulationSaveRecord> {
  const save = getDB().simulationSaves.find((s) => s.id === id);
  if (!save) throw new Error("Sauvegarde introuvable");
  save.name = name.trim();
  save.depart = params.depart;
  save.mensuel = params.mensuel;
  save.objectif = params.objectif;
  save.duree = params.duree;
  save.taux = params.taux;
  save.updatedAt = new Date();
  commit();
  return { ...params, id: save.id, type: save.type as SimulationType, name: save.name, updatedAt: save.updatedAt };
}

export async function deleteSimulationSave(id: string): Promise<void> {
  const db = getDB();
  db.simulationSaves = db.simulationSaves.filter((s) => s.id !== id);
  commit();
}

export async function getSimulateurSeedData() {
  const db = getDB();
  const today = new Date();
  const totalPatrimoine = db.financialAccounts.reduce((s, a) => s + a.balance, 0);
  const totalRecurringMonthly = db.investments
    .filter((i) => i.isRecurring && (!i.dateEndRecurring || i.dateEndRecurring >= today))
    .reduce((s, i) => s + i.amount, 0);
  return { totalPatrimoine, totalRecurringMonthly };
}
