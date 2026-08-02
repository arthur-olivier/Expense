import { getSimulateurSeedData, getSimulationSaves } from "@/actions/simulateur.actions";
import SimulateurClient from "@/components/features/simulateur/SimulateurClient";

export default async function SimulateurPage() {
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
