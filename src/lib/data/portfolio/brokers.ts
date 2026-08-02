// Aiguillage courtiers : démo (store) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/portfolio/brokers.actions";
import * as demo from "@/lib/demo/api/portfolio";

export const createBroker = isDemo ? demo.createBroker : server.createBroker;
export const getBrokers = isDemo ? demo.getBrokers : server.getBrokers;
export const getBrokerTransactions = isDemo ? demo.getBrokerTransactions : server.getBrokerTransactions;
export const addBrokerDeposit = isDemo ? demo.addBrokerDeposit : server.addBrokerDeposit;
export const addBrokerWithdrawal = isDemo ? demo.addBrokerWithdrawal : server.addBrokerWithdrawal;
export const deleteBrokerCashTransaction = isDemo ? demo.deleteBrokerCashTransaction : server.deleteBrokerCashTransaction;
