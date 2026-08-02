import type { getDashboardData } from "@/actions/dashboard.actions";

// données du dashboard dérivées du retour de l'action, chaque composant Pick ce qu'il utilise
export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
