// Aiguillage revenus : démo (store) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/charges/revenus.actions";
import * as demo from "@/lib/demo/api/charges";

export const addRevenu = isDemo ? demo.addRevenu : server.addRevenu;
export const getRevenusByMonth = isDemo ? demo.getRevenusByMonth : server.getRevenusByMonth;
export const updateRevenu = isDemo ? demo.updateRevenu : server.updateRevenu;
export const deleteRevenu = isDemo ? demo.deleteRevenu : server.deleteRevenu;
