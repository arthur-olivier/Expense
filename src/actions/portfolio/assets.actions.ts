"use server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth";

// ─────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────

// crée un actif manuel, sans maj auto du cours
export async function createAssetManual({
  name,
  isin,
  ticker,
  currency,
  lastPrice,
}: {
  name: string;
  isin?: string;
  ticker?: string;
  currency: string;
  lastPrice?: number;
}) {
  const user = await getAuthenticatedUser();
  return prisma.asset.create({
    data: {
      userId: user.id,
      name,
      isin,
      ticker,
      currency,
      autoUpdate: false,
      lastPrice: lastPrice ?? null,
      lastPriceAt: lastPrice !== undefined ? new Date() : null,
    },
  });
}

// ─────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────

// actifs distincts détenus (quantité > 0), triés par nom
export async function getOwnedAssets() {
  const user = await getAuthenticatedUser();
  const positions = await prisma.position.findMany({
    where: { portfolio: { userId: user.id }, quantity: { gt: 0 } },
    include: { asset: true },
    distinct: ["assetId"],
  });
  return positions.map((p) => p.asset).sort((a, b) => a.name.localeCompare(b.name));
}

// ─────────────────────────────────────────────────────────────
// UPDATE
// ─────────────────────────────────────────────────────────────

// maj du cours d'un actif après vérif de propriété
export async function updateAssetPrice(assetId: string, price: number) {
  const user = await getAuthenticatedUser();
  const asset = await prisma.asset.findFirst({ where: { id: assetId, userId: user.id } });
  if (!asset) throw new Error("Titre introuvable");
  return prisma.asset.update({
    where: { id: assetId },
    data: { lastPrice: price, lastPriceAt: new Date() },
  });
}

// maj des cours de plusieurs actifs (à l'utilisateur) en une transaction
export async function updateAssetPrices(updates: { assetId: string; price: number }[]) {
  const user = await getAuthenticatedUser();
  const owned = await prisma.asset.findMany({
    where: { id: { in: updates.map((u) => u.assetId) }, userId: user.id },
    select: { id: true },
  });
  const ownedIds = new Set(owned.map((a) => a.id));
  const now = new Date();

  await prisma.$transaction(
    updates
      .filter((u) => ownedIds.has(u.assetId))
      .map((u) =>
        prisma.asset.update({
          where: { id: u.assetId },
          data: { lastPrice: u.price, lastPriceAt: now },
        }),
      ),
  );
}
