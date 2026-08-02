"use client";

// En mode démo, les données vivent dans le navigateur : la page Charges (server component)
// ne peut pas les lire côté serveur. Ce loader client les récupère depuis le store puis
// rend le même ChargesClient qu'en prod.

import { useFetch } from "@/hooks/useFetch";
import Spinner from "@/components/shared/Spinner";
import ChargesClient from "./ChargesClient";
import { getRevenusByMonth } from "@/lib/data/charges/revenus";
import { getDepensesByMonth } from "@/lib/data/charges/depenses";
import { getInvestmentsByMonth } from "@/lib/data/charges/investments";

export default function ChargesDemoLoader({ year, month }: { year: number; month: number }) {
  const { data, isLoading } = useFetch(
    () => Promise.all([getRevenusByMonth(year, month), getDepensesByMonth(year, month), getInvestmentsByMonth(year, month)]),
    [year, month],
  );

  if (isLoading || !data) return <Spinner />;
  const [revenus, depenses, investments] = data;

  return (
    <ChargesClient
      key={`${year}-${month}`}
      year={year}
      month={month}
      initialRevenus={revenus}
      initialDepenses={depenses}
      initialInvestments={investments}
    />
  );
}
