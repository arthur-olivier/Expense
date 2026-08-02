// Aiguillage dépenses : démo (store) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/charges/depenses.actions";
import * as demo from "@/lib/demo/api/charges";

export const addDepense = isDemo ? demo.addDepense : server.addDepense;
export const getDepensesByMonth = isDemo ? demo.getDepensesByMonth : server.getDepensesByMonth;
export const updateDepense = isDemo ? demo.updateDepense : server.updateDepense;
export const deleteDepense = isDemo ? demo.deleteDepense : server.deleteDepense;
