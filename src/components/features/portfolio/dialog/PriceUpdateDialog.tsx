"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { TrendingUp } from "lucide-react";

import { getOwnedAssets, updateAssetPrices } from "@/lib/data/portfolio/assets";
import type { Asset } from "@/types/portfolio";

import { Button } from "@/components/ui/button";
import Modal from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function formatAmountIn(value: number, currency: string) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(value);
}

export default function PriceUpdateDialog({ onUpdated }: { onUpdated: () => void }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [assets, setAssets] = useState<Asset[] | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});

  function handleOpen() {
    setOpen(true);
    setAssets(null);
    setPrices({});
    getOwnedAssets()
      .then(setAssets)
      .catch(() => toast.error("Impossible de charger tes titres."));
  }

  function handleSubmit() {
    if (!assets) return;
    const updates = assets
      .map((a) => {
        const raw = prices[a.id] ?? (a.lastPrice !== null ? String(a.lastPrice) : undefined);
        if (!raw) return null;
        const price = Number(raw);
        return Number.isNaN(price) ? null : { assetId: a.id, price };
      })
      .filter((u): u is { assetId: string; price: number } => u !== null);

    if (updates.length === 0) {
      toast.error("Aucun cours à mettre à jour.");
      return;
    }

    startTransition(async () => {
      try {
        await updateAssetPrices(updates);
        toast.success(`${updates.length} cours mis à jour`);
        setOpen(false);
        onUpdated();
      } catch {
        toast.error("Mise à jour impossible.");
      }
    });
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen}>
        <TrendingUp className="size-4" />
        Mettre à jour les cours
      </Button>

      <Modal
        title="Mettre à jour les cours"
        open={open}
        confirmLabel={isPending ? "Enregistrement..." : "Enregistrer"}
        onClose={() => setOpen(false)}
        onConfirm={handleSubmit}
      >
        <div className="space-y-3">
          {!assets && (
            <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-caption)" }}>
              Chargement...
            </p>
          )}
          {assets?.length === 0 && (
            <p className="py-8 text-center text-xs" style={{ color: "var(--color-text-caption)" }}>
              Aucun titre en portefeuille pour l&apos;instant.
            </p>
          )}
          {assets?.map((a) => (
            <div key={a.id} className="space-y-1">
              <Label htmlFor={`price-${a.id}`}>
                {a.name} {a.ticker ? `(${a.ticker})` : ""}
              </Label>
              <Input
                id={`price-${a.id}`}
                type="number"
                step="0.01"
                min="0"
                value={prices[a.id] ?? (a.lastPrice !== null ? String(a.lastPrice) : "")}
                onChange={(e) => setPrices((prev) => ({ ...prev, [a.id]: e.target.value }))}
                placeholder={
                  a.lastPrice !== null ? formatAmountIn(a.lastPrice, a.currency) : "Cours"
                }
              />
              <p className="text-xs" style={{ color: "var(--color-text-caption)" }}>
                Dernier renseignement :{" "}
                {a.lastPriceAt ? new Date(a.lastPriceAt).toLocaleDateString("fr-FR") : "Jamais"}
              </p>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
