"use client";

// Loader client du tableau de bord en mode démo : lit les données agrégées depuis le
// store puis rend la vue partagée DashboardView.

import { useFetch } from "@/hooks/useFetch";
import Spinner from "@/components/shared/Spinner";
import DashboardView from "./DashboardView";
import { getDashboardData } from "@/lib/data/dashboard";

export default function DashboardDemoLoader() {
  const { data, isLoading } = useFetch(() => getDashboardData(), []);
  if (isLoading || !data) return <Spinner />;
  return <DashboardView data={data} />;
}
