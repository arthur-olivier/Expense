"use server";

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/app/generated/prisma/client";
import { getAuthenticatedUser } from "@/lib/auth";
import { computeBuyAmount, computeSellAmount } from "@/lib/calculations/portfolio-calculations";
import { getBrokerProvider, listBrokers as listBrokerProviders } from "@/lib/brokerImport/registry";
import { listAccounts, type BrokerRow } from "@/lib/brokerImport/types";
import {
  recalcPosition,
  recalcBrokerBalance,
  recalcPortfolioCashBalance,
  applyCashEffect,
  findOrCreateAssetForImport,
  type CashHolder,
} from "./shared";

// Retourne la liste des courtiers supportés pour l'import de fichiers.
export async function listSupportedBrokerProviders() {
  await getAuthenticatedUser();
  return listBrokerProviders();
}

// Parse un fichier d'export courtier et retourne un aperçu des comptes détectés sans rien importer.
export async function previewBrokerImport(brokerProviderId: string, file: File) {
  await getAuthenticatedUser();
  const provider = getBrokerProvider(brokerProviderId);
  const buffer = Buffer.from(await file.arrayBuffer());
  const rows = provider.parseFile(buffer);
  if (rows.length === 0) throw new Error("Aucune transaction reconnue dans ce fichier.");
  return {
    totalRows: rows.length,
    accounts: listAccounts(rows, provider),
    suggestedBrokerName: provider.label,
  };
}

type ImportResult = {
  imported: number;
  skippedExisting: number;
  unsupported: { date: Date; type: string; description: string }[];
  // montant ajouté auto si le cash du groupe serait resté négatif après rejeu de tout l'historique
  // (signe qu'il manque des lignes en amont, ex: export qui ne couvre pas l'ouverture du compte)
  adjustment: number | null;
};

// ligne d'import annotée : son portefeuille + le compte source (accountId) pour le rapport final
type TaggedRow = {
  row: BrokerRow;
  portfolio: CashHolder & { name: string };
  accountId: string;
};

// rejoue en une passe chronologique les lignes d'un groupe partageant le même détenteur de cash
// (le courtier pour des portefeuilles hasOwnCash=false, ou un seul portefeuille hasOwnCash=true)
// évite de faire tomber le solde en négatif selon l'ordre de traitement : ex CTO + Crypto sur le même courtier, lignes mélangées par date
async function importHolderGroup(
  userId: string,
  provider: ReturnType<typeof getBrokerProvider>,
  entries: TaggedRow[],
  accountLabelById: Map<string, string>,
): Promise<Map<string, ImportResult>> {
  entries.sort((a, b) => a.row.date.getTime() - b.row.date.getTime());

  const transactionIds = entries.map((e) => e.row.transactionId);
  const holderPortfolio = entries[0].portfolio;

  const [existingPortfolioTx, existingBrokerTx] = await Promise.all([
    prisma.portfolioTransaction.findMany({
      where: { externalId: { in: transactionIds } },
      select: { externalId: true },
    }),
    holderPortfolio.brokerId
      ? prisma.brokerCashTransaction.findMany({
          where: { brokerId: holderPortfolio.brokerId, externalId: { in: transactionIds } },
          select: { externalId: true },
        })
      : Promise.resolve([]),
  ]);
  const existingIds = new Set([
    ...existingPortfolioTx.map((e) => e.externalId),
    ...existingBrokerTx.map((e) => e.externalId),
  ]);

  const results = new Map<string, ImportResult>();
  const resultFor = (accountId: string) => {
    let result = results.get(accountId);
    if (!result) {
      result = { imported: 0, skippedExisting: 0, unsupported: [], adjustment: null };
      results.set(accountId, result);
    }
    return result;
  };

  for (const { row, portfolio, accountId } of entries) {
    const result = resultFor(accountId);
    if (existingIds.has(row.transactionId)) {
      result.skippedExisting++;
      continue;
    }

    const movement = provider.mapRowToMovement(row);
    if (movement.kind === "SKIPPED") {
      result.unsupported.push({
        date: row.date,
        type: `${row.category}/${row.type}`,
        description: row.description,
      });
      continue;
    }

    await prisma.$transaction(async (tx) => {
      if (movement.kind === "BUY" || movement.kind === "SELL") {
        const assetId = await findOrCreateAssetForImport(tx, userId, row, movement.price);
        const amount =
          movement.kind === "BUY"
            ? computeBuyAmount(movement.quantity, movement.price, movement.fees)
            : computeSellAmount(movement.quantity, movement.price, movement.fees);

        const created = await tx.portfolioTransaction.create({
          data: {
            portfolioId: portfolio.id,
            assetId,
            type: movement.kind,
            quantity: movement.quantity,
            price: movement.price,
            fees: movement.fees,
            amount,
            date: row.date,
            externalId: row.transactionId,
          },
        });
        await applyCashEffect(tx, portfolio, movement.kind, amount, row.date, created.id);
        await recalcPosition(tx, portfolio.id, assetId);
      } else if (movement.kind === "DIVIDEND") {
        const assetId = row.symbol ? await findOrCreateAssetForImport(tx, userId, row, null) : null;
        const created = await tx.portfolioTransaction.create({
          data: {
            portfolioId: portfolio.id,
            assetId,
            type: "DIVIDEND",
            amount: movement.amount,
            fees: 0,
            date: row.date,
            externalId: row.transactionId,
          },
        });
        await applyCashEffect(tx, portfolio, "DIVIDEND", movement.amount, row.date, created.id);
      } else {
        // DEPOSIT / WITHDRAWAL / INTERNAL_TRANSFER : même effet cash, seul le type persisté change
        // (distingue un vrai mouvement bancaire d'un virement interne détecté, voir linkInternalTransfers)
        const persistedType = movement.kind;
        const signedAmount = movement.kind === "WITHDRAWAL" ? -movement.amount : movement.amount;
        const counterpartyLabel =
          movement.kind === "INTERNAL_TRANSFER" && row.internalTransferCounterpartyGroup
            ? (accountLabelById.get(row.internalTransferCounterpartyGroup) ?? null)
            : null;

        if (portfolio.hasOwnCash) {
          await tx.portfolioTransaction.create({
            data: {
              portfolioId: portfolio.id,
              type: persistedType,
              amount: signedAmount,
              fees: 0,
              date: row.date,
              externalId: row.transactionId,
              counterpartyLabel,
            },
          });
          await tx.portfolio.update({
            where: { id: portfolio.id },
            data: { cashBalance: { increment: signedAmount } },
          });
        } else {
          const currentBroker = await tx.broker.findUniqueOrThrow({
            where: { id: portfolio.brokerId! },
          });
          await tx.brokerCashTransaction.create({
            data: {
              brokerId: portfolio.brokerId!,
              // renseigné seulement pour un virement interne : l'historique courtier affiche vers/depuis quel compte (voir BrokerSection.tsx)
              // un vrai dépôt/retrait n'est rattaché à aucun portefeuille
              portfolioId: movement.kind === "INTERNAL_TRANSFER" ? portfolio.id : null,
              type: persistedType,
              amount: signedAmount,
              balanceAfter: currentBroker.cashBalance + signedAmount,
              date: row.date,
              externalId: row.transactionId,
              counterpartyLabel,
            },
          });
          await tx.broker.update({
            where: { id: portfolio.brokerId! },
            data: { cashBalance: { increment: signedAmount } },
          });
        }
      }
    });

    result.imported++;
  }

  const totalImported = [...results.values()].reduce((sum, r) => sum + r.imported, 0);
  if (totalImported > 0) {
    // réconcilie le solde depuis les transactions réelles plutôt que les incréments de la boucle
    // (solde correct même après plusieurs réimports/suppressions, voir recalcBrokerBalance)
    const reconcile = (tx: Prisma.TransactionClient) =>
      holderPortfolio.hasOwnCash
        ? recalcPortfolioCashBalance(tx, holderPortfolio.id)
        : recalcBrokerBalance(tx, holderPortfolio.brokerId!);

    const holderBalance = await prisma.$transaction(reconcile);

    if (holderBalance < -1e-6) {
      const topUp = -holderBalance;
      const lastDate = entries[entries.length - 1]?.row.date ?? new Date();
      await prisma.$transaction(async (tx) => {
        if (holderPortfolio.hasOwnCash) {
          await tx.portfolioTransaction.create({
            data: {
              portfolioId: holderPortfolio.id,
              type: "DEPOSIT_ADJUSTMENT",
              amount: topUp,
              fees: 0,
              date: lastDate,
            },
          });
        } else {
          await tx.brokerCashTransaction.create({
            data: {
              brokerId: holderPortfolio.brokerId!,
              type: "DEPOSIT_ADJUSTMENT",
              amount: topUp,
              balanceAfter: 0,
              date: lastDate,
            },
          });
        }
        // redérive le solde (et balanceAfter) après l'ajustement
        await reconcile(tx);
      });
      // un groupe peut couvrir plusieurs comptes (ex CTO + Crypto) : le manque de cash est collectif,
      // donc l'avertissement va sur chacun des comptes du groupe
      for (const result of results.values()) result.adjustment = topUp;
    }
  }

  return results;
}

// importe un fichier courtier (crée ou réutilise courtier + portefeuilles)
// renvoie un rapport par compte : lignes importées, ignorées, non supportées
export async function importBrokerFile({
  brokerProviderId,
  file,
  broker,
  mappings,
}: {
  brokerProviderId: string;
  file: File;
  broker: { brokerId?: string; createNew?: { name: string } };
  mappings: {
    accountId: string;
    portfolioId?: string;
    createNew?: { name: string; type: string; hasOwnCash: boolean };
  }[];
}) {
  const user = await getAuthenticatedUser();
  const provider = getBrokerProvider(brokerProviderId);
  const buffer = Buffer.from(await file.arrayBuffer());
  const allRows = provider.parseFile(buffer);

  let brokerId = broker.brokerId;
  if (!brokerId && broker.createNew) {
    const createdBroker = await prisma.broker.create({
      data: { userId: user.id, name: broker.createNew.name, cashBalance: 0 },
    });
    brokerId = createdBroker.id;
  } else if (brokerId) {
    const existingBroker = await prisma.broker.findFirst({
      where: { id: brokerId, userId: user.id },
    });
    if (!existingBroker) throw new Error("Courtier introuvable");
  }

  // résout/crée tous les portefeuilles avant de rejouer le moindre mouvement
  // (nécessaire pour regrouper ensuite par détenteur de cash, voir importHolderGroup)
  const accounts: {
    accountId: string;
    label: string;
    portfolio: CashHolder & { name: string };
    rows: BrokerRow[];
  }[] = [];

  for (const mapping of mappings) {
    const accountRows = allRows.filter((r) => provider.getPortfolioGroupKey(r) === mapping.accountId);
    if (accountRows.length === 0) continue;

    let portfolio: CashHolder & { name: string };

    if (mapping.portfolioId) {
      const found = await prisma.portfolio.findFirst({
        where: { id: mapping.portfolioId, userId: user.id },
      });
      if (!found) throw new Error("Portefeuille introuvable");
      portfolio = found;
    } else if (mapping.createNew) {
      if (!mapping.createNew.hasOwnCash && !brokerId) {
        throw new Error("Un portefeuille sans cash propre doit être associé à un courtier.");
      }
      const earliestDate = accountRows.reduce(
        (earliest, r) => (r.date < earliest ? r.date : earliest),
        accountRows[0].date,
      );
      portfolio = await prisma.portfolio.create({
        data: {
          userId: user.id,
          name: mapping.createNew.name,
          type: mapping.createNew.type,
          hasOwnCash: mapping.createNew.hasOwnCash,
          brokerId: brokerId ?? null,
          openedAt: earliestDate,
          cashBalance: 0,
        },
      });
    } else {
      throw new Error("Choisis un portefeuille ou la création automatique pour chaque compte.");
    }

    accounts.push({
      accountId: mapping.accountId,
      label: provider.suggestPortfolioLabel(mapping.accountId),
      portfolio,
      rows: accountRows,
    });
  }

  // regroupe par détenteur de cash réel (le courtier si hasOwnCash=false, sinon le portefeuille)
  const holderGroups = new Map<string, TaggedRow[]>();
  for (const account of accounts) {
    const holderKey = account.portfolio.hasOwnCash
      ? `portfolio:${account.portfolio.id}`
      : `broker:${account.portfolio.brokerId}`;
    const entries = holderGroups.get(holderKey) ?? [];
    for (const row of account.rows) {
      entries.push({ row, portfolio: account.portfolio, accountId: account.accountId });
    }
    holderGroups.set(holderKey, entries);
  }

  // nom du portefeuille par compte source, pour libeller la contrepartie d'un virement interne
  const accountLabelById = new Map(accounts.map((a) => [a.accountId, a.portfolio.name]));

  const resultsByAccountId = new Map<string, ImportResult>();
  for (const entries of holderGroups.values()) {
    const groupResults = await importHolderGroup(user.id, provider, entries, accountLabelById);
    for (const [accountId, result] of groupResults) {
      resultsByAccountId.set(accountId, result);
    }
  }

  return accounts.map((account) => ({
    accountId: account.accountId,
    label: account.label,
    portfolioId: account.portfolio.id,
    portfolioName: account.portfolio.name,
    ...(resultsByAccountId.get(account.accountId) ?? {
      imported: 0,
      skippedExisting: 0,
      unsupported: [],
      adjustment: null,
    }),
  }));
}
