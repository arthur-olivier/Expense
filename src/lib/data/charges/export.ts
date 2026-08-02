// Aiguillage export charges : démo (store) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/charges/export.actions";
import * as demo from "@/lib/demo/api/charges";

export type { ExportScope } from "@/actions/charges/export.actions";
export const getExportData = isDemo ? demo.getExportData : server.getExportData;
