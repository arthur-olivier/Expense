import { getSimulateurSeedData, getSimulationSaves } from "@/actions/simulateur.actions";
import SimulateurClient from "@/components/features/simulateur/SimulateurClient";
import SimulateurDemoLoader from "@/components/features/simulateur/SimulateurDemoLoader";
import { isDemo } from "@/lib/demo";

export default async function SimulateurPage() {
  // En démo, les données sont dans le navigateur : on délègue le chargement au client.
  if (isDemo) return <SimulateurDemoLoader />;

  const [{ totalPatrimoine, totalRecurringMonthly }, saves] = await Promise.all([
    getSimulateurSeedData(),
    getSimulationSaves(),
  ]);

  return (
    <SimulateurClient
      initialPatrimoine={totalPatrimoine}
      initialRecurring={totalRecurringMonthly}
      initialSaves={saves}
    />
  );
}
