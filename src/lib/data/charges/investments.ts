// Aiguillage placements : démo (store) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/charges/investments.actions";
import * as demo from "@/lib/demo/api/charges";

export const addInvestment = isDemo ? demo.addInvestment : server.addInvestment;
export const getInvestmentsByMonth = isDemo ? demo.getInvestmentsByMonth : server.getInvestmentsByMonth;
export const updateInvestment = isDemo ? demo.updateInvestment : server.updateInvestment;
export const deleteInvestment = isDemo ? demo.deleteInvestment : server.deleteInvestment;
