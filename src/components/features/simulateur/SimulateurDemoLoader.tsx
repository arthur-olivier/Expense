"use client";

// Équivalent client de la page simulateur pour le mode démo : lit le seed + les
// sauvegardes depuis le store, puis rend le même SimulateurClient qu'en prod.

import { useFetch } from "@/hooks/useFetch";
import Spinner from "@/components/shared/Spinner";
import SimulateurClient from "./SimulateurClient";
import { getSimulateurSeedData, getSimulationSaves } from "@/lib/data/simulateur";

export default function SimulateurDemoLoader() {
  const { data, isLoading } = useFetch(() => Promise.all([getSimulateurSeedData(), getSimulationSaves()]), []);

  if (isLoading || !data) return <Spinner />;
  const [{ totalPatrimoine, totalRecurringMonthly }, saves] = data;

  return (
    <SimulateurClient initialPatrimoine={totalPatrimoine} initialRecurring={totalRecurringMonthly} initialSaves={saves} />
  );
}
