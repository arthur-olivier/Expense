"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, History, Plus, TrendingUp, TrendingDown } from "lucide-react";

import { getPortfolio, getPortfolioTransactions, getAssetPerformance } from "@/lib/data/portfolio/portfolios";
import { updateAssetPrice } from "@/lib/data/portfolio/assets";
import {
  addBuyTransaction,
  addSellTransaction,
  addDepositTransaction,
  addWithdrawalTransaction,
  addDividendTransaction,
  deleteTransaction,
} from "@/lib/data/portfolio/movements";
import {
  computeMontantInvesti,
  computeValeurActuelle,
  computePlusValueLatente,
  computePlusValuePct,
  computeMontantNetRetrait,
} from "@/lib/calculations/portfolio-calculations";
import { PortfolioTypeLabels } from "@/lib/enums";
import { formatEUR } from "@/lib/utils";
import type { Portfolio, PortfolioTransactionRow, AssetPerformance } from "@/types/portfolio";
import PieChart from "@/components/shared/PieChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import InformationDialog from "@/components/shared/InformationDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PositionsTable from "./PositionsTable";
import MovementDialog, { type MovementData } from "./dialog/MovementDialog";
import PortfolioHistoryDialog from "./dialog/PortfolioHistoryDialog";
import EditPortfolioDialog from "./dialog/EditPortfolioDialog";
import { formatPct } from "./portfolioFormat";

type PendingBuy = {
  assetId: string;
  quantity: number;
  price: number;
  fees: number;
  date: Date;
  updatePrice: boolean;
};

const PIE_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#ef4444", "#84cc16", "#f97316", "#14b8a6"];

export default function PortfolioCard({
  portfolio,
  onChange,
}: {
  portfolio: Portfolio;
  onChange: (portfolio: Portfolio) => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [movementOpen, setMovementOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [transactions, setTransactions] = useState<PortfolioTransactionRow[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // perf par titre, chargée au dépliage de la ligne
  const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
  const [perfByAssetId, setPerfByAssetId] = useState<Record<string, AssetPerformance>>({});
  const [loadingAssetId, setLoadingAssetId] = useState<string | null>(null);

  const [pendingBuy, setPendingBuy] = useState<PendingBuy | null>(null);
  const [shortfall, setShortfall] = useState(0);
  const [confirmDepositOpen, setConfirmDepositOpen] = useState(false);

  const effectiveCashBalance = portfolio.hasOwnCash ? portfolio.cashBalance : (portfolio.broker?.cashBalance ?? 0);

  const positions = portfolio.positions.filter((p) => p.quantity > 1e-9);
  const montantInvestiTotal = positions.reduce((sum, p) => sum + computeMontantInvesti({ quantity: p.quantity, pru: p.pru }), 0);
  const valeurPositionsTotal = positions.reduce(
    (sum, p) => sum + computeValeurActuelle({ quantity: p.quantity, pru: p.pru }, p.asset.lastPrice),
    0,
  );
  const plusValueTotal = computePlusValueLatente(valeurPositionsTotal, montantInvestiTotal);
  const valeurTotale = valeurPositionsTotal + (portfolio.hasOwnCash ? portfolio.cashBalance : 0);
  const valeurNetteTotal =
    positions.reduce((sum, p) => {
      const montantInvesti = computeMontantInvesti({ quantity: p.quantity, pru: p.pru });
      const valeurActuelle = computeValeurActuelle({ quantity: p.quantity, pru: p.pru }, p.asset.lastPrice);
      const plusValue = computePlusValueLatente(valeurActuelle, montantInvesti);
      return sum + computeMontantNetRetrait(valeurActuelle, plusValue, portfolio.type, portfolio.openedAt);
    }, 0) + (portfolio.hasOwnCash ? portfolio.cashBalance : 0);

  //Slices pour le PieChart
  const repartitionSlices = positions
    .map((p, i) => ({
      label: p.asset.name,
      value: computeValeurActuelle({ quantity: p.quantity, pru: p.pru }, p.asset.lastPrice),
      color: PIE_COLORS[i % PIE_COLORS.length],
    }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  //On recupere les infos du portfolio
  async function refreshPortfolio() {
    const fresh = await getPortfolio(portfolio.id);
    onChange(fresh);
  }

  //Chargement de l'historique
  function handleOpenHistory() {
    setHistoryOpen(true);
    setLoadingHistory(true);
    getPortfolioTransactions(portfolio.id)
      .then(setTransactions)
      .catch(() => toast.error("Impossible de charger l'historique."))
      .finally(() => setLoadingHistory(false));
  }

  //au dépliage d'une action, on va chercher ses infos
  function handleToggleAssetPerf(assetId: string) {
    //déjà dépliée, on referme
    if (expandedAssetId === assetId) {
      setExpandedAssetId(null);
      return;
    }
    setExpandedAssetId(assetId);
    // fetch au premier dépliage seulement, ensuite mis en cache par titre
    if (!perfByAssetId[assetId]) {
      setLoadingAssetId(assetId);
      getAssetPerformance(portfolio.id, assetId)
        .then((perf) => setPerfByAssetId((prev) => ({ ...prev, [assetId]: perf })))
        .catch(() => toast.error("Impossible de calculer la performance."))
        .finally(() => setLoadingAssetId((cur) => (cur === assetId ? null : cur)));
    }
  }

  //confirmation achat : dépôt d'argent nécessaire + achat
  function submitBuy(payload: PendingBuy, confirmAutoDeposit: boolean) {
    startTransition(async () => {
      try {
        const res = await addBuyTransaction({ portfolioId: portfolio.id, ...payload, confirmAutoDeposit });
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        await refreshPortfolio();
        toast.success(confirmAutoDeposit ? "Dépôt automatique + achat enregistrés" : res.message);
        setMovementOpen(false);
        setConfirmDepositOpen(false);
        setPendingBuy(null);
      } catch {
        toast.error("Opération impossible.");
      }
    });
  }

  //Confirmation de la popup d'achat
  function handleConfirmAutoDeposit() {
    if (!pendingBuy) return;
    submitBuy(pendingBuy, true);
  }

  // logique métier des saisies du MovementDialog : vérif cash + auto-dépôt si achat, sinon appel serveur
  function handleMovementConfirm(data: MovementData) {
    //Dans le cas d'un achat
    if (data.type === "BUY") {
      const cost = data.quantity * data.price + data.fees;
      const payload: PendingBuy = {
        assetId: data.assetId,
        quantity: data.quantity,
        price: data.price,
        fees: data.fees,
        date: data.date,
        updatePrice: data.updatePrice,
      };
      //Si la personne ne possede pas assez d'argent
      if (cost > effectiveCashBalance + 1e-6) {
        setMovementOpen(false);
        setPendingBuy(payload);
        setShortfall(cost - effectiveCashBalance);
        setConfirmDepositOpen(true);
        return;
      }
      submitBuy(payload, false);
      return;
    }

    startTransition(async () => {
      try {
        let res;
        //vente
        if (data.type === "SELL") {
          res = await addSellTransaction({
            portfolioId: portfolio.id,
            assetId: data.assetId,
            quantity: data.quantity,
            price: data.price,
            fees: data.fees,
            date: data.date,
          });
          //dividend
        } else if (data.type === "DIVIDEND") {
          res = await addDividendTransaction({
            portfolioId: portfolio.id,
            assetId: data.assetId,
            amount: data.amount,
            date: data.date,
          });
          //depot d argent
        } else if (data.type === "DEPOSIT") {
          res = await addDepositTransaction({ portfolioId: portfolio.id, amount: data.amount, date: data.date });
        } else {
          //Retrait d'argent
          res = await addWithdrawalTransaction({ portfolioId: portfolio.id, amount: data.amount, date: data.date });
        }
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        await refreshPortfolio();
        toast.success(res.message);
        setMovementOpen(false);
      } catch {
        toast.error("Opération impossible.");
      }
    });
  }

  //Suppression d'une transaction
  function handleDeleteTransaction(transactionId: string) {
    startTransition(async () => {
      try {
        const res = await deleteTransaction(transactionId);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        setTransactions((prev) => prev?.filter((t) => t.id !== transactionId) ?? null);
        await refreshPortfolio();
        toast.success(res.message);
      } catch {
        toast.error("Suppression impossible.");
      }
    });
  }

  //Changement du prix d'une action
  function handleManualPriceUpdate(assetId: string, price: number) {
    startTransition(async () => {
      try {
        await updateAssetPrice(assetId, price);
        await refreshPortfolio();

        // cours changé : perf en cache périmée, on la vide et on recharge si déplié
        if (expandedAssetId === assetId) {
          const perf = await getAssetPerformance(portfolio.id, assetId);
          setPerfByAssetId((prev) => ({ ...prev, [assetId]: perf }));
        } else {
          setPerfByAssetId((prev) => {
            const next = { ...prev };
            delete next[assetId];
            return next;
          });
        }

        toast.success("Cours mis à jour");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Mise à jour impossible.");
      }
    });
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-4">
        {/* Partie du haut - Nom + Argent */}
        <div className="flex items-center gap-3">
          {/* Nom, type de compte et bouton Edit */}
          <p className="min-w-0 truncate font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {portfolio.name}
          </p>
          <span
            className="rounded-full px-2 py-0.5 text-xs font-medium"
            style={{ background: "var(--color-investment-bg)", color: "var(--color-investment)" }}
          >
            {PortfolioTypeLabels[portfolio.type] ?? portfolio.type}
          </span>
          {!portfolio.hasOwnCash && (
            <span className="text-xs" style={{ color: "var(--color-text-caption)" }}>
              Cash délégué
            </span>
          )}
          <EditPortfolioDialog portfolio={portfolio} onUpdated={refreshPortfolio} />
          <div className="flex-1" />
          {/* Argent du portfolio */}
          <div className="text-right">
            <p className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
              {formatEUR(valeurTotale)}
            </p>
            {montantInvestiTotal > 0 && (
              <p
                className="flex items-center justify-end gap-1 text-xs font-medium"
                style={{ color: plusValueTotal >= 0 ? "var(--color-success)" : "var(--color-danger)" }}
              >
                {plusValueTotal >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {formatEUR(plusValueTotal)} ({formatPct(computePlusValuePct(plusValueTotal, montantInvestiTotal))})
              </p>
            )}
            <p className="text-xs" style={{ color: "var(--color-text-caption)" }}>
              Net (après impôt) : {formatEUR(valeurNetteTotal)}
            </p>
          </div>
        </div>

        {/* Partie du bas - Positions + Historique + Mouvement */}
        <div className="mt-3 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen((prev) => !prev)}
            className="flex-1 gap-1.5 border-dashed text-xs font-medium text-muted-foreground"
          >
            <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            {open ? "Réduire" : "Positions"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleOpenHistory}
            className="gap-1.5 border-dashed text-xs font-medium text-muted-foreground"
          >
            <History className="size-3.5" /> Historique
          </Button>
          <Button size="sm" onClick={() => setMovementOpen(true)} aria-label="Mouvement">
            <Plus className="size-4 md:mr-1.5" />
            <span className="hidden md:inline">Mouvement</span>
          </Button>
        </div>

        {open && (
          <div className="mt-4 space-y-3">
            {/* Cash disponible si le portfolio possede son propre cash */}
            {portfolio.hasOwnCash && (
              <div
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "var(--color-bg-surface)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  Cash disponible
                </p>
                <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                  {formatEUR(portfolio.cashBalance)}
                </p>
              </div>
            )}

            {positions.length === 0 ? (
              <p className="py-4 text-center text-xs" style={{ color: "var(--color-text-caption)" }}>
                Aucune position pour l&apos;instant.
              </p>
            ) : (
              // Tabs des positions et de la repartition
              <Tabs defaultValue="positions">
                <TabsList>
                  <TabsTrigger value="positions">Positions</TabsTrigger>
                  {repartitionSlices.length > 0 && <TabsTrigger value="repartition">Répartition</TabsTrigger>}
                </TabsList>

                {/* Positions */}
                <TabsContent value="positions" className="mt-3">
                  <PositionsTable
                    positions={positions}
                    portfolioType={portfolio.type}
                    portfolioOpenedAt={portfolio.openedAt}
                    expandedAssetId={expandedAssetId}
                    perfByAssetId={perfByAssetId}
                    loadingAssetId={loadingAssetId}
                    isPending={isPending}
                    onToggleAssetPerf={handleToggleAssetPerf}
                    onManualPriceUpdate={handleManualPriceUpdate}
                  />
                </TabsContent>

                {/* Repartition */}
                {repartitionSlices.length > 0 && (
                  <TabsContent value="repartition" className="mt-3">
                    <div className="flex justify-center py-4">
                      <PieChart slices={repartitionSlices} />
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            )}
          </div>
        )}
      </CardContent>

      {/* modal ajout mouvement */}
      <MovementDialog
        open={movementOpen}
        portfolioName={portfolio.name}
        isPending={isPending}
        hasOwnCash={portfolio.hasOwnCash}
        onClose={() => setMovementOpen(false)}
        onConfirm={handleMovementConfirm}
      />

      {/* modal si solde insuffisant */}
      <InformationDialog
        open={confirmDepositOpen}
        onOpenChange={(o) => {
          setConfirmDepositOpen(o);
          if (!o) setPendingBuy(null);
        }}
        title="Cash insuffisant"
        cancelLabel="Annuler"
        confirmLabel={isPending ? "Enregistrement..." : "Déposer et acheter"}
        confirmDisabled={isPending}
        onConfirm={handleConfirmAutoDeposit}
      >
        Il manque {formatEUR(shortfall)}
        {!portfolio.hasOwnCash && portfolio.broker ? ` sur le cash de ${portfolio.broker.name}` : ""} pour cet achat. Un dépôt
        automatique de {formatEUR(shortfall)} sera enregistré juste avant, pour que le cash ne passe jamais en négatif.
      </InformationDialog>

      {/* modal historique des transactions */}
      <PortfolioHistoryDialog
        open={historyOpen}
        portfolioName={portfolio.name}
        loading={loadingHistory}
        transactions={transactions}
        isPending={isPending}
        onClose={() => setHistoryOpen(false)}
        onDelete={handleDeleteTransaction}
      />
    </Card>
  );
}
