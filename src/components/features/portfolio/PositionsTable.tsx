"use client";

import { Fragment, useState } from "react";
import { ChevronDown, ChevronRight, Pencil } from "lucide-react";

// Import des actions
import {
  computeMontantInvesti,
  computeValeurActuelle,
  computePlusValueLatente,
  computePlusValuePct,
  computeMontantNetRetrait,
} from "@/lib/calculations/portfolio-calculations";

import { formatEUR, formatCurrency } from "@/lib/utils";
import InfoTooltip from "@/components/shared/InfoTooltip";
import Modal from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AssetPerformance, Asset, Position } from "@/types/portfolio";
import { AssetPerfDetail } from "./AssetPerfDetail";
import { formatPct } from "./portfolioFormat";

type Props = {
  positions: Position[];
  portfolioType: string;
  portfolioOpenedAt: Date;
  expandedAssetId: string | null;
  perfByAssetId: Record<string, AssetPerformance>;
  loadingAssetId: string | null;
  isPending: boolean;
  onToggleAssetPerf: (assetId: string) => void;
  onManualPriceUpdate: (assetId: string, price: number) => void;
};

export default function PositionsTable({
  positions,
  portfolioType,
  portfolioOpenedAt,
  expandedAssetId,
  perfByAssetId,
  loadingAssetId,
  isPending,
  onToggleAssetPerf,
  onManualPriceUpdate,
}: Props) {
  // titre dont on édite le cours (null = modale fermée) + prix saisi
  const [assetBeingEdited, setAssetBeingEdited] = useState<Asset | null>(null);
  const [editedPrice, setEditedPrice] = useState("");

  // ouvre la modale d'édition, pré-remplie avec le cours actuel
  function openModalEditAssetPrice(asset: Asset) {
    setAssetBeingEdited(asset);
    setEditedPrice(asset.lastPrice !== null ? String(asset.lastPrice) : "");
  }

  // ferme sans enregistrer
  function closeModalEditAssetPrice() {
    setAssetBeingEdited(null);
  }

  // valide le cours, remonte au parent et ferme
  function confirmEditAssetPrice() {
    if (!assetBeingEdited) return;
    onManualPriceUpdate(assetBeingEdited.id, Number(editedPrice));
    setAssetBeingEdited(null);
  }

  return (
    <>
      <Table>
        {/* -----------------------------HEADER */}
        <TableHeader>
          <TableRow>
            <TableHead>Titre</TableHead>
            <TableHead className="text-right">Qté</TableHead>
            <TableHead className="text-right">PRU</TableHead>
            <TableHead className="text-right">Cours</TableHead>
            <TableHead className="text-right">Valeur</TableHead>
            <TableHead className="text-right">+/- value</TableHead>
            <TableHead className="text-right">
              <span className="inline-flex items-center gap-1">
                Net si vente
                <InfoTooltip content="Valeur actuelle moins l'impôt estimé sur la plus-value (PFU 30% en CTO, 30% en PEA avant 5 ans, 17,2% de prélèvements sociaux en PEA après 5 ans)." />
              </span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* -----------------------------CALCULS POUR CHAQUE POSITION */}
          {positions.map((p) => {
            const montantInvesti = computeMontantInvesti({ quantity: p.quantity, pru: p.pru });
            const valeurActuelle = computeValeurActuelle({ quantity: p.quantity, pru: p.pru }, p.asset.lastPrice);
            const plusValue = computePlusValueLatente(valeurActuelle, montantInvesti);
            const pct = computePlusValuePct(plusValue, montantInvesti);
            const net = computeMontantNetRetrait(valeurActuelle, plusValue, portfolioType, portfolioOpenedAt);
            const expanded = expandedAssetId === p.assetId;
            return (
              <Fragment key={p.id}>
                <TableRow className="cursor-pointer" onClick={() => onToggleAssetPerf(p.assetId)}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {expanded ? (
                        <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                      )}
                      {p.asset.name}
                      {/* edit du cours, stopPropagation pour ne pas déplier la ligne */}
                      <span onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openModalEditAssetPrice(p.asset)}
                          className="inline-flex items-center justify-center rounded-full"
                          style={{ color: "var(--color-text-muted)" }}
                          title="Mettre à jour le cours"
                        >
                          <Pencil className="size-3" />
                        </button>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{p.quantity}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatEUR(p.pru)}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.asset.lastPrice !== null ? formatCurrency(p.asset.lastPrice, p.asset.currency) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatEUR(valeurActuelle)}</TableCell>
                  <TableCell
                    className="text-right font-medium tabular-nums"
                    style={{ color: plusValue >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
                  >
                    {formatEUR(plusValue)} ({formatPct(pct)})
                  </TableCell>
                  <TableCell className="text-right tabular-nums" style={{ color: "var(--color-text-secondary)" }}>
                    {formatEUR(net)}
                  </TableCell>
                </TableRow>
                {/* Details des positions*/}
                {expanded && (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={7} className="bg-muted/30 p-4">
                      <AssetPerfDetail loading={loadingAssetId === p.assetId} perf={perfByAssetId[p.assetId]} />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      {/* Modale d'édition du cours */}
      <Modal
        title={assetBeingEdited ? `Mettre à jour le cours — ${assetBeingEdited.name}` : ""}
        open={assetBeingEdited !== null}
        confirmLabel={isPending ? "Enregistrement..." : "Enregistrer"}
        onClose={closeModalEditAssetPrice}
        onConfirm={confirmEditAssetPrice}
      >
        <div className="space-y-2">
          <Label htmlFor="edit-asset-price">Cours actuel</Label>
          <Input
            id="edit-asset-price"
            type="number"
            step="0.01"
            min="0"
            value={editedPrice}
            onChange={(e) => setEditedPrice(e.target.value)}
            required
          />
        </div>
      </Modal>
    </>
  );
}
