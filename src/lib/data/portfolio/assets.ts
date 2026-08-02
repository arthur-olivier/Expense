// Aiguillage actifs : démo (store) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/portfolio/assets.actions";
import * as demo from "@/lib/demo/api/portfolio";

export const createAssetManual = isDemo ? demo.createAssetManual : server.createAssetManual;
export const getOwnedAssets = isDemo ? demo.getOwnedAssets : server.getOwnedAssets;
export const updateAssetPrice = isDemo ? demo.updateAssetPrice : server.updateAssetPrice;
export const updateAssetPrices = isDemo ? demo.updateAssetPrices : server.updateAssetPrices;
