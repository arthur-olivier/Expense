import * as XLSX from "xlsx";
import type { BrokerRow, MappedMovement, BrokerImportProvider } from "../types";
import { cashFlow, linkInternalTransfers } from "../types";

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      result.push(cur);
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function toNumberOrNull(value: string | undefined): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function parseFile(buffer: Buffer): BrokerRow[] {
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null });
  if (rawRows.length === 0) return [];

  const singleCellPerRow = (rawRows[0]?.length ?? 0) <= 1;
  const lines: string[][] = singleCellPerRow
    ? rawRows.map((r) => parseCsvLine(String(r[0] ?? "")))
    : rawRows.map((r) => r.map((c) => String(c ?? "")));

  const headers = lines[0].map((h) => h.trim());
  const rows: BrokerRow[] = [];

  for (const values of lines.slice(1)) {
    if (values.length === 0 || values.every((v) => !v)) continue;
    const record: Record<string, string> = {};
    headers.forEach((h, i) => (record[h] = values[i] ?? ""));
    if (!record.transaction_id || !record.date) continue;

    rows.push({
      transactionId: record.transaction_id,
      date: new Date(record.datetime || record.date),
      accountId: record.account_type ?? "",
      category: record.category ?? "",
      type: record.type ?? "",
      assetClass: record.asset_class ?? "",
      name: record.name ?? "",
      symbol: record.symbol ?? "",
      shares: toNumberOrNull(record.shares),
      price: toNumberOrNull(record.price),
      amount: toNumberOrNull(record.amount),
      fee: toNumberOrNull(record.fee),
      tax: toNumberOrNull(record.tax),
      currency: record.currency || "EUR",
      description: record.description ?? "",
    });
  }

  linkInternalTransfers(rows, getPortfolioGroupKey, DEPOSIT_TYPES, WITHDRAWAL_TYPES);

  return rows;
}

const DEPOSIT_TYPES = new Set([
  "TRANSFER_IN",
  "TRANSFER_INBOUND",
  "TRANSFER_INSTANT_INBOUND",
  "CUSTOMER_INPAYMENT",
  "PEA_MARKETING",
  "MANUAL",
  "STOCKPERK",
]);

const WITHDRAWAL_TYPES = new Set([
  "TRANSFER_OUT",
  "TRANSFER_OUTBOUND",
  "TRANSFER_INSTANT_OUTBOUND",
]);

// le champ price de certains exports est parfois corrompu (ex décimale manquante : "5774.000000" au lieu de "5.774000")
// amount (débité/crédité) est toujours fiable, donc on dérive le prix depuis amount/shares sauf si l'un manque
function resolveTradePrice(row: BrokerRow): number | null {
  if (row.amount !== null && row.shares !== null && row.shares !== 0) {
    return Math.abs(row.amount) / Math.abs(row.shares);
  }
  return row.price;
}

function mapRowToMovement(row: BrokerRow): MappedMovement {
  if (row.internalTransfer) {
    return { kind: "INTERNAL_TRANSFER", amount: cashFlow(row) };
  }
  if (row.category === "TRADING" && row.type === "BUY") {
    const price = resolveTradePrice(row);
    if (row.shares === null || price === null)
      return { kind: "SKIPPED", reason: "Achat sans quantité/prix" };
    const fees = Math.abs(row.fee ?? 0) + Math.abs(row.tax ?? 0);
    return { kind: "BUY", quantity: Math.abs(row.shares), price, fees };
  }
  if (row.category === "TRADING" && row.type === "SELL") {
    const price = resolveTradePrice(row);
    if (row.shares === null || price === null)
      return { kind: "SKIPPED", reason: "Vente sans quantité/prix" };
    const fees = Math.abs(row.fee ?? 0) + Math.abs(row.tax ?? 0);
    return { kind: "SELL", quantity: Math.abs(row.shares), price, fees };
  }
  if (row.category === "CASH" && row.type === "DIVIDEND") {
    if (row.amount === null) return { kind: "SKIPPED", reason: "Dividende sans montant" };
    return { kind: "DIVIDEND", amount: cashFlow(row) };
  }
  if (row.category === "CASH" && DEPOSIT_TYPES.has(row.type) && cashFlow(row) > 0) {
    return { kind: "DEPOSIT", amount: cashFlow(row) };
  }
  if (row.category === "CASH" && WITHDRAWAL_TYPES.has(row.type) && cashFlow(row) < 0) {
    return { kind: "WITHDRAWAL", amount: Math.abs(cashFlow(row)) };
  }
  return { kind: "SKIPPED", reason: `Type non pris en charge : ${row.category}/${row.type}` };
}

// le compte DEFAULT de TR mélange actions/ETF et crypto sous un même account_type
// on les sépare en deux portefeuilles via la clé "DEFAULT_CRYPTO"
// le cash pur (asset_class vide) reste sous "DEFAULT" : sans importance car hasOwnCash=false, il va sur le Broker (voir applyCashEffect)
function getPortfolioGroupKey(row: BrokerRow): string {
  if (row.accountId === "DEFAULT" && row.assetClass === "CRYPTO") return "DEFAULT_CRYPTO";
  return row.accountId;
}

const ACCOUNT_LABELS: Record<string, string> = {
  PEA: "PEA",
  DEFAULT: "Compte-titres",
  DEFAULT_CRYPTO: "Crypto",
};

const ACCOUNT_TYPES: Record<string, string> = {
  PEA: "PEA",
  DEFAULT: "CTO",
  DEFAULT_CRYPTO: "CRYPTO",
};

// le PEA a sa propre liquidité chez TR ; le compte DEFAULT (CTO + crypto) non :
// l'argent passe par le cash partagé, jamais stocké dans ce compte
const ACCOUNT_HAS_OWN_CASH: Record<string, boolean> = {
  PEA: true,
  DEFAULT: false,
  DEFAULT_CRYPTO: false,
};

export const tradeRepublicProvider: BrokerImportProvider = {
  id: "trade_republic",
  label: "Trade Republic",
  parseFile,
  mapRowToMovement,
  getPortfolioGroupKey,
  suggestPortfolioLabel: (groupKey) => ACCOUNT_LABELS[groupKey] ?? groupKey,
  suggestPortfolioType: (groupKey) => ACCOUNT_TYPES[groupKey] ?? "CTO",
  suggestHasOwnCash: (groupKey) => ACCOUNT_HAS_OWN_CASH[groupKey] ?? true,
};
