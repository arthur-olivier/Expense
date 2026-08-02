import { getDashboardData } from "@/actions/dashboard.actions";
import DashboardView from "@/components/features/dashboard/DashboardView";
import DashboardDemoLoader from "@/components/features/dashboard/DashboardDemoLoader";
import { isDemo } from "@/lib/demo";

export default async function DashboardPage() {
  // En démo, les données sont dans le navigateur : on délègue le chargement au client.
  if (isDemo) return <DashboardDemoLoader />;

  const data = await getDashboardData();
  return <DashboardView data={data} />;
}
