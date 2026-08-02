import type {
  Incomes,
  Expenses,
  Investments,
  FinancialAccount,
  WalletCategory,
} from "../app/generated/prisma/client";

export type Revenu = Incomes;
export type Depense = Expenses;
export type Investment = Investments & {
  account: FinancialAccount;
  category: WalletCategory | null;
};
