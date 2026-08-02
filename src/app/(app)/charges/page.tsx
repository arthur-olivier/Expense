import { getRevenusByMonth } from "@/actions/charges/revenus.actions";
import { getDepensesByMonth } from "@/actions/charges/depenses.actions";
import { getInvestmentsByMonth } from "@/actions/charges/investments.actions";
import ChargesClient from "@/components/features/charges/ChargesClient";
import ChargesDemoLoader from "@/components/features/charges/ChargesDemoLoader";
import { isDemo } from "@/lib/demo";

export default async function ChargesPage({ searchParams }: { searchParams: Promise<{ year?: string; month?: string }> }) {
  const params = await searchParams;
  const now = new Date();

  const year = params.year != null ? Number(params.year) : now.getFullYear();
  const month = params.month != null ? Number(params.month) : now.getMonth();

  // En démo, les données sont dans le navigateur : on délègue le chargement au client.
  if (isDemo) return <ChargesDemoLoader year={year} month={month} />;

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
