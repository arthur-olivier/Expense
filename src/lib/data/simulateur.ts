// Aiguillage simulateur : démo (store) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/simulateur.actions";
import * as demo from "@/lib/demo/api/simulateur";

// Types : on garde ceux des server actions comme référence (effacés au runtime)
export type {
  PatrimoineCategory,
  PatrimoineAccount,
  PatrimoineBreakdown,
  SimulationType,
  SimulationParams,
  SimulationSaveRecord,
} from "@/actions/simulateur.actions";

export const getPatrimoineBreakdown = isDemo ? demo.getPatrimoineBreakdown : server.getPatrimoineBreakdown;
export const getSimulationSaves = isDemo ? demo.getSimulationSaves : server.getSimulationSaves;
export const createSimulationSave = isDemo ? demo.createSimulationSave : server.createSimulationSave;
export const updateSimulationSave = isDemo ? demo.updateSimulationSave : server.updateSimulationSave;
export const deleteSimulationSave = isDemo ? demo.deleteSimulationSave : server.deleteSimulationSave;
export const getSimulateurSeedData = isDemo ? demo.getSimulateurSeedData : server.getSimulateurSeedData;
