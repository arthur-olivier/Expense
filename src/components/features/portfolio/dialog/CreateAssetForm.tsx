"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createAssetManual } from "@/actions/portfolio/assets.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Asset } from "@/types/portfolio";

type Props = {
  onCreated: (asset: Asset) => void;
};

// sous-formulaire de création d'un titre, remonte l'asset créé au parent via onCreated
export default function CreateAssetForm({ onCreated }: Props) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [isin, setIsin] = useState("");
  const [ticker, setTicker] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [lastPrice, setLastPrice] = useState("");

  //Creation de l asset
  function handleCreate() {
    startTransition(async () => {
      try {
        //Creation du titre en bdd
        const asset = await createAssetManual({
          name,
          isin: isin || undefined,
          ticker: ticker || undefined,
          currency: currency || "EUR",
          lastPrice: lastPrice ? Number(lastPrice) : undefined,
        });
        toast.success("Titre créé");
        onCreated(asset);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible de créer ce titre.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Input placeholder="Nom du titre" value={name} onChange={(e) => setName(e.target.value)} required />
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="ISIN (optionnel)" value={isin} onChange={(e) => setIsin(e.target.value)} />
        <Input placeholder="Ticker (optionnel)" value={ticker} onChange={(e) => setTicker(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input placeholder="Devise" value={currency} onChange={(e) => setCurrency(e.target.value)} />
        <Input
          type="number"
          step="0.01"
          placeholder="Cours actuel"
          value={lastPrice}
          onChange={(e) => setLastPrice(e.target.value)}
        />
      </div>
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleCreate}>
        Créer ce titre
      </Button>
    </div>
  );
}
