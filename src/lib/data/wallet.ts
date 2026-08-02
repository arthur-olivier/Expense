// Aiguillage des données « comptes d'épargne » : en démo → store navigateur, en prod → server actions.
// L'UI importe depuis ce module, jamais directement les actions, pour que le mode démo soit transparent.

import { isDemo } from "@/lib/demo";
import * as server from "@/actions/wallet.actions";
import * as demo from "@/lib/demo/api/wallet";

export const getWallets = isDemo ? demo.getWallets : server.getWallets;
export const getWallet = isDemo ? demo.getWallet : server.getWallet;
export const getWalletTransactions = isDemo ? demo.getWalletTransactions : server.getWalletTransactions;
export const createWallet = isDemo ? demo.createWallet : server.createWallet;
export const createCategory = isDemo ? demo.createCategory : server.createCategory;
export const updateWallet = isDemo ? demo.updateWallet : server.updateWallet;
export const updateCategory = isDemo ? demo.updateCategory : server.updateCategory;
export const deleteWallet = isDemo ? demo.deleteWallet : server.deleteWallet;
export const deleteCategory = isDemo ? demo.deleteCategory : server.deleteCategory;
export const addMoneyToAccount = isDemo ? demo.addMoneyToAccount : server.addMoneyToAccount;
export const withdrawMoney = isDemo ? demo.withdrawMoney : server.withdrawMoney;
export const withdrawMoneyToOtherAccount = isDemo ? demo.withdrawMoneyToOtherAccount : server.withdrawMoneyToOtherAccount;
export const transferMoney = isDemo ? demo.transferMoney : server.transferMoney;
