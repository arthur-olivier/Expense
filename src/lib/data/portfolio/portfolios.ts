// Aiguillage portefeuilles : démo (store) ou prod (server action)
import { isDemo } from "@/lib/demo";
import * as server from "@/actions/portfolio/portfolios.actions";
import * as demo from "@/lib/demo/api/portfolio";

export const createPortfolio = isDemo ? demo.createPortfolio : server.createPortfolio;
export const updatePortfolioOpenedAt = isDemo ? demo.updatePortfolioOpenedAt : server.updatePortfolioOpenedAt;
export const getPortfolios = isDemo ? demo.getPortfolios : server.getPortfolios;
export const getPortfolio = isDemo ? demo.getPortfolio : server.getPortfolio;
export const getPortfolioTransactions = isDemo ? demo.getPortfolioTransactions : server.getPortfolioTransactions;
export const getAssetPerformance = isDemo ? demo.getAssetPerformance : server.getAssetPerformance;
export const getPortfolioOpenedAtMax = isDemo ? demo.getPortfolioOpenedAtMax : server.getPortfolioOpenedAtMax;
