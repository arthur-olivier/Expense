import { getRevenusByMonth } from "@/actions/charges/revenus.actions";
import { getDepensesByMonth } from "@/actions/charges/depenses.actions";
import { getInvestmentsByMonth } from "@/actions/charges/investments.actions";
import ChargesClient from "@/components/features/charges/ChargesClient";

export default async function ChargesPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const params = await searchParams;
  const now = new Date();

  let year = now.getFullYear();
  if (params.year != null) {
    year = Number(params.year);
  }

  let month = now.getMonth();
  if (params.month != null) {
    month = Number(params.month);
  }

  const [revenus, depenses, investments] = await Promise.all([
    getRevenusByMonth(year, month),
    getDepensesByMonth(year, month),
    getInvestmentsByMonth(year, month),
  ]);

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
