import type {
  FinancialAccount,
  WalletCategory as PrismaWalletCategory,
} from "../app/generated/prisma/client";

// vue poche d'un compte côté client (sous-ensemble Prisma) ; dérivé de WalletCategory pour suivre le schéma
export type WalletCategory = Pick<PrismaWalletCategory, "id" | "name" | "balance">;

// vue compte d'épargne avec ses poches, renvoyée par getWallets
export type Wallet = Pick<
  FinancialAccount,
  "id" | "name" | "isLocked" | "balance" | "balanceUpdatedAt"
> & {
  categories: WalletCategory[];
};
