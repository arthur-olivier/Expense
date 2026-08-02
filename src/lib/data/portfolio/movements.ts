// Aiguillage mouvements : démo (store) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/portfolio/movements.actions";
import * as demo from "@/lib/demo/api/portfolio";

export const addBuyTransaction = isDemo ? demo.addBuyTransaction : server.addBuyTransaction;
export const addSellTransaction = isDemo ? demo.addSellTransaction : server.addSellTransaction;
export const addDepositTransaction = isDemo ? demo.addDepositTransaction : server.addDepositTransaction;
export const addWithdrawalTransaction = isDemo ? demo.addWithdrawalTransaction : server.addWithdrawalTransaction;
export const addDividendTransaction = isDemo ? demo.addDividendTransaction : server.addDividendTransaction;
export const deleteTransaction = isDemo ? demo.deleteTransaction : server.deleteTransaction;
