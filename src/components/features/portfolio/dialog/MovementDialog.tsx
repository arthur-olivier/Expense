"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getOwnedAssets } from "@/lib/data/portfolio/assets";
import Modal from "@/components/shared/Modal";
import GenericSelect from "@/components/shared/GenericSelect";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PortfolioTransactionTypeLabels } from "@/lib/enums";
import { formatCurrency } from "@/lib/utils";
import type { Asset, MovementType } from "@/types/portfolio";
import { toDateInputValue } from "../portfolioFormat";
import CreateAssetForm from "./CreateAssetForm";

// données remontées au parent à la confirmation, il gère ensuite le métier (vérif cash, auto-dépôt, appels serveur)
export type MovementData = {
  type: MovementType;
  assetId: string;
  quantity: number;
  price: number;
  fees: number;
  amount: number;
  date: Date;
  updatePrice: boolean;
};

type Props = {
  open: boolean;
  portfolioName: string;
  isPending: boolean;
  hasOwnCash: boolean;
  onClose: () => void;
  onConfirm: (data: MovementData) => void;
};

export default function MovementDialog({ open, portfolioName, isPending, hasOwnCash, onClose, onConfirm }: Props) {
  const availableMovementTypes: MovementType[] = hasOwnCash
    ? ["BUY", "SELL", "DEPOSIT", "WITHDRAWAL", "DIVIDEND"]
    : ["BUY", "SELL", "DIVIDEND"];

  //Mouvement choisi
  const [movementType, setMovementType] = useState<MovementType>("BUY");
  //Les differents titres que possede la personne
  const [ownedAssets, setOwnedAssets] = useState<Asset[]>([]);
  //Titre id selectionne
  const [selectedAssetId, setSelectedAssetId] = useState("");
  //Titre selectionne
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  //Selection de la tab
  const [assetMode, setAssetMode] = useState<"pick" | "manual">("pick");

  //Les diffferents attributs
  const [movementDate, setMovementDate] = useState(toDateInputValue(new Date()));
  const [quantity, setQuantity] = useState("");
  const [price, setPrice] = useState("");
  const [fees, setFees] = useState("0");
  const [amount, setAmount] = useState("");
  const [updatePrice, setUpdatePrice] = useState(true);

  //Reinit le form et recharge les titres à chaque ouverture
  useEffect(() => {
    if (!open) return;
    setMovementType("BUY");
    setSelectedAssetId("");
    setSelectedAsset(null);
    setMovementDate(toDateInputValue(new Date()));
    setQuantity("");
    setPrice("");
    setFees("0");
    setAmount("");
    getOwnedAssets()
      .then((assets) => {
        setOwnedAssets(assets);
        setAssetMode(assets.length > 0 ? "pick" : "manual");
      })
      .catch(() => toast.error("Impossible de charger tes titres."));
  }, [open]);

  //Changement de la tab des titres
  function handleAssetModeChange(mode: "pick" | "manual") {
    setAssetMode(mode);
    setSelectedAssetId("");
    setSelectedAsset(null);
  }

  //Quand on choisit un titre
  function handlePickExisting(assetId: string) {
    setSelectedAssetId(assetId);
    setSelectedAsset(ownedAssets.find((a) => a.id === assetId) ?? null);
  }

  //Titre créé via le sous-form, on le sélectionne aussitôt
  function handleAssetCreated(asset: Asset) {
    setOwnedAssets((prev) => [...prev, asset]);
    setSelectedAsset(asset);
    setSelectedAssetId(asset.id);
    setAssetMode("pick");
  }

  const needsAsset = movementType === "BUY" || movementType === "SELL" || movementType === "DIVIDEND";

  //Confirmation de la modal
  function handleConfirm() {
    if (needsAsset && !selectedAssetId) {
      toast.error("Choisis un titre.");
      return;
    }
    //Dialogu de confirmation final qui revient au parent par la suite
    onConfirm({
      type: movementType,
      assetId: selectedAssetId,
      quantity: Number(quantity),
      price: Number(price),
      fees: Number(fees || 0),
      amount: Number(amount),
      date: new Date(movementDate),
      updatePrice: movementType === "BUY" ? updatePrice : false,
    });
  }

  //Preview de l'asset
  const assetPreview = selectedAsset
    ? {
        name: selectedAsset.name,
        isin: selectedAsset.isin ?? "—",
        ticker: selectedAsset.ticker ?? "—",
        currency: selectedAsset.currency,
        price:
          selectedAsset.lastPrice !== null
            ? formatCurrency(selectedAsset.lastPrice, selectedAsset.currency)
            : "Cours non renseigné",
      }
    : null;

  return (
    <Modal
      title={`Nouveau mouvement — ${portfolioName}`}
      className="md:min-w-[500px]"
      open={open}
      confirmLabel={isPending ? "Enregistrement..." : "Confirmer"}
      onClose={onClose}
      onConfirm={handleConfirm}
    >
      <div className="space-y-4">
        {/* Selection du type de mouvement */}
        <div className="space-y-2">
          <Label>Type de mouvement</Label>
          <GenericSelect
            items={availableMovementTypes}
            getValue={(t) => t}
            getLabel={(t) => PortfolioTransactionTypeLabels[t]}
            value={movementType}
            onValueChange={(v) => setMovementType(v as MovementType)}
          />
        </div>

        {/* Selection du type de mouvement */}
        {needsAsset && (
          <div className="space-y-2 rounded-lg border p-3" style={{ borderColor: "var(--color-border-subtle)" }}>
            <div className="flex items-center justify-between">
              <Label>Titre</Label>
              {/* Tabs sur les titres */}
              <Tabs value={assetMode} onValueChange={(v) => handleAssetModeChange(v as "pick" | "manual")}>
                <TabsList>
                  {ownedAssets.length > 0 && <TabsTrigger value="pick">Existant</TabsTrigger>}
                  <TabsTrigger value="manual">Nouveau titre</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Selection d'un titre existant*/}
            {assetMode === "pick" && (
              <GenericSelect
                items={ownedAssets}
                getValue={(a) => a.id}
                getLabel={(a) => `${a.name}${a.ticker ? ` (${a.ticker})` : ""}`}
                value={selectedAssetId}
                onValueChange={handlePickExisting}
                placeholder="Choisir un titre"
              />
            )}

            {/* Creation d'un titre*/}
            {assetMode === "manual" && <CreateAssetForm onCreated={handleAssetCreated} />}

            {assetPreview && assetMode === "pick" && (
              <div className="space-y-2 border-t pt-2" style={{ borderColor: "var(--color-border-subtle)" }}>
                <Input value={assetPreview.name} readOnly />
                <div className="grid grid-cols-2 gap-2">
                  <Input value={assetPreview.isin} readOnly placeholder="ISIN" />
                  <Input value={assetPreview.ticker} readOnly placeholder="Ticker" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={assetPreview.currency} readOnly placeholder="Devise" />
                  <Input value={assetPreview.price} readOnly placeholder="Cours actuel" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quantite et prix unitaire et frais dans le cadre d'un achat ou d'une revente */}
        {(movementType === "BUY" || movementType === "SELL") && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Prix unitaire</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fees">Frais</Label>
              <Input id="fees" type="number" step="0.01" min="0" value={fees} onChange={(e) => setFees(e.target.value)} />
            </div>
          </>
        )}

        {/* achat only : propose de rafraichir le cours avec le prix payé, à décocher pour un achat rétroactif */}
        {movementType === "BUY" && (
          <div
            className="flex items-center justify-between rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--color-border-subtle)" }}
          >
            <span className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
              Mettre à jour le cours du titre avec ce prix
            </span>
            <Switch checked={updatePrice} onCheckedChange={setUpdatePrice} />
          </div>
        )}
        {/* Montant dans le cas d'un depot, d un retrait ou de dividend */}
        {(movementType === "DEPOSIT" || movementType === "WITHDRAWAL" || movementType === "DIVIDEND") && (
          <div className="space-y-2">
            <Label htmlFor="amount">Montant</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
        )}

        {/* Date du mouvement */}
        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" value={movementDate} onChange={(e) => setMovementDate(e.target.value)} required />
        </div>
      </div>
    </Modal>
  );
}
