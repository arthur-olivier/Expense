// Aiguillage import courtier : démo (désactivé) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/portfolio/import.actions";
import * as demo from "@/lib/demo/api/portfolio";

export const listSupportedBrokerProviders = isDemo ? demo.listSupportedBrokerProviders : server.listSupportedBrokerProviders;
export const previewBrokerImport = isDemo ? demo.previewBrokerImport : server.previewBrokerImport;
export const importBrokerFile = isDemo ? demo.importBrokerFile : server.importBrokerFile;
