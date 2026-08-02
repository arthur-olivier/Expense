// Aiguillage export des mouvements de comptes : démo (store) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/wallet-export.actions";
import * as demo from "@/lib/demo/api/wallet";

export type { TransactionExportScope } from "@/actions/wallet-export.actions";
export const getWalletsTransactionsForExport = isDemo
  ? demo.getWalletsTransactionsForExport
  : server.getWalletsTransactionsForExport;
