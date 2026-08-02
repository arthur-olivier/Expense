// Aiguillage tableau de bord : démo (store) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/dashboard.actions";
import * as demo from "@/lib/demo/api/dashboard";

export const getDashboardData = isDemo ? demo.getDashboardData : server.getDashboardData;
