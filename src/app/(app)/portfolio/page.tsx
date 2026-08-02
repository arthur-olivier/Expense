"use client";

import { useState, useEffect } from "react";
import { LineChart } from "lucide-react";

import { getPortfolios } from "@/actions/portfolio/portfolios.actions";
import { getBrokers } from "@/actions/portfolio/brokers.actions";
import { useFetch } from "@/hooks/useFetch";
import Spinner from "@/components/shared/Spinner";
import FetchError from "@/components/shared/FetchError";
import PortfolioCard from "@/components/features/portfolio/PortfolioCard";
import BrokerSection from "@/components/features/portfolio/BrokerSection";
import ImportBrokerDialog from "@/components/features/portfolio/dialog/ImportBrokerDialog";
import PriceUpdateDialog from "@/components/features/portfolio/dialog/PriceUpdateDialog";
import CreatePortfolioDialog from "@/components/features/portfolio/dialog/CreatePortfolioDialog";
import PageGuide from "@/components/shared/PageGuide";
import MobileNavDrawer from "@/components/shared/MobileNavDrawer";
import {
  computeMontantInvesti,
  computeValeurActuelle,
  computePlusValueLatente,
  computeMontantNetRetrait,
} from "@/lib/calculations/portfolio-calculations";
import type { Portfolio } from "@/types/portfolio";
import { formatEUR } from "@/lib/utils";

import { Card, CardContent } from "@/components/ui/card";

// somme valeur / plus-value / valeur nette sur tous les portefeuilles
// cash d'un portefeuille délégué (hasOwnCash false) compté au niveau du courtier, une seule fois via countedBrokerIds
function computeTotals(portfolios: Portfolio[]) {
  let valeurTotale = 0;
  let valeurNetteTotale = 0;
  let plusValueTotale = 0;
  // brokers déjà comptés : leur cash est partagé, à additionner une seule fois
  const countedBrokerIds = new Set<string>();

  for (const p of portfolios) {
    // on ignore les positions soldées (quantité ~0)
    const positions = p.positions.filter((pos) => pos.quantity > 1e-9);
    const montantInvesti = positions.reduce(
      (sum, pos) => sum + computeMontantInvesti({ quantity: pos.quantity, pru: pos.pru }),
      0,
    );
    const valeurPositions = positions.reduce(
      (sum, pos) => sum + computeValeurActuelle({ quantity: pos.quantity, pru: pos.pru }, pos.asset.lastPrice),
      0,
    );

    // valeur nette = valeur actuelle - impôt estimé sur la PV, position par position (taux selon type de compte et date d'ouverture)
    const valeurNettePositions = positions.reduce((sum, pos) => {
      const valeurActuelle = computeValeurActuelle({ quantity: pos.quantity, pru: pos.pru }, pos.asset.lastPrice);
      const montantInvestiPos = computeMontantInvesti({ quantity: pos.quantity, pru: pos.pru });
      const plusValue = computePlusValueLatente(valeurActuelle, montantInvestiPos);
      return sum + computeMontantNetRetrait(valeurActuelle, plusValue, p.type, p.openedAt);
    }, 0);

    valeurTotale += valeurPositions;
    valeurNetteTotale += valeurNettePositions;
    plusValueTotale += computePlusValueLatente(valeurPositions, montantInvesti);

    // cash : soit propre au portefeuille, soit celui du broker (ajouté à la première rencontre)
    if (p.hasOwnCash) {
      valeurTotale += p.cashBalance;
      valeurNetteTotale += p.cashBalance;
    } else if (p.brokerId && p.broker && !countedBrokerIds.has(p.brokerId)) {
      countedBrokerIds.add(p.brokerId);
      valeurTotale += p.broker.cashBalance;
      valeurNetteTotale += p.broker.cashBalance;
    }
  }

  return { valeurTotale, valeurNetteTotale, plusValueTotale };
}

// regroupe les portefeuilles par courtier : ceux liés à un broker sous sa section, les autres en cartes indépendantes
function groupByBroker(portfolios: Portfolio[]) {
  const brokerGroups = new Map<string, Portfolio[]>();
  const standalonePortfolios: Portfolio[] = [];
  for (const p of portfolios) {
    if (p.brokerId && p.broker) {
      if (!brokerGroups.has(p.brokerId)) brokerGroups.set(p.brokerId, []);
      brokerGroups.get(p.brokerId)!.push(p);
    } else {
      standalonePortfolios.push(p);
    }
  }
  return { brokerGroups, standalonePortfolios };
}

export default function PortfolioPage() {
  const { data: fetchedPortfolios, isLoading, error, refetch: refetchPortfolios } = useFetch(() => getPortfolios(), []);
  const { data: brokers, error: brokersError, refetch: refetchBrokers } = useFetch(() => getBrokers(), []);

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);

  // sync du state local quand useFetch ramène les données
  useEffect(() => {
    if (fetchedPortfolios) setPortfolios(fetchedPortfolios);
  }, [fetchedPortfolios]);

  function refreshAll() {
    refetchPortfolios();
    refetchBrokers();
  }

  // maj ciblée : remplace juste la carte concernée, pas de refetch
  function handlePortfolioChange(fresh: Portfolio) {
    setPortfolios((prev) => prev.map((p) => (p.id === fresh.id ? fresh : p)));
  }

  if (error || brokersError) return <FetchError message="Impossible de charger tes portefeuilles." onRetry={refreshAll} />;
  if (isLoading) return <Spinner />;

  //valeur totale en bourse
  const totals = computeTotals(portfolios ?? []);
  //courtiers + portfolios sans courtier
  const { brokerGroups, standalonePortfolios } = groupByBroker(portfolios ?? []);

  return (
    <div className="space-y-6">
      {/* Partie du haut - Bourse + Boutons */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                Bourse
              </h1>
              <PageGuide pageKey="portfolio" autoOpen={(portfolios?.length ?? 0) === 0} />
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Suivi de tes portefeuilles boursiers (PEA, CTO...)
            </p>
          </div>
          {/* avatar en haut à droite sur mobile */}
          <div className="md:hidden">
            <MobileNavDrawer />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriceUpdateDialog onUpdated={refreshAll} />
          <ImportBrokerDialog portfolios={portfolios ?? []} onImported={refreshAll} />
          <CreatePortfolioDialog brokers={brokers ?? []} onCreated={refreshAll} />
        </div>
      </div>

      {/* Encart valeur totale */}
      <div
        className="rounded-2xl px-5 py-5 overflow-hidden md:px-7 md:py-6"
        style={{
          background: "var(--color-bg-card)",
          boxShadow: "var(--shadow-card-lg)",
          borderTop: "3px solid var(--color-investment)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "var(--color-text-muted)" }}>
          Valeur totale
        </p>
        <p className="text-4xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          {formatEUR(totals.valeurTotale)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <p
            className="text-sm font-medium"
            style={{
              color: totals.plusValueTotale >= 0 ? "var(--color-success)" : "var(--color-danger)",
            }}
          >
            {totals.plusValueTotale >= 0 ? "+" : ""}
            {formatEUR(totals.plusValueTotale)} de plus-value latente
          </p>
          <span className="text-xs" style={{ color: "var(--color-text-caption)" }}>
            · Net (après impôt) : {formatEUR(totals.valeurNetteTotale)}
          </span>
        </div>
      </div>

      {/* Partie du bas - Affichage identique pour chaque portfolio */}
      {/* Aucun portfolio */}
      {(portfolios?.length ?? 0) === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm" style={{ color: "var(--color-text-caption)" }}>
            <LineChart className="mx-auto mb-2 size-6" style={{ color: "var(--color-text-muted)" }} />
            Aucun portefeuille pour l&apos;instant. Crée ton premier PEA ou CTO.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Portfolio regroupé par broker */}
          {[...brokerGroups.entries()].map(([brokerId, group]) => (
            <BrokerSection key={brokerId} broker={group[0].broker!} onChange={refreshAll}>
              <div className="flex flex-col gap-3">
                {group.map((portfolio) => (
                  <PortfolioCard key={portfolio.id} portfolio={portfolio} onChange={handlePortfolioChange} />
                ))}
              </div>
            </BrokerSection>
          ))}
          {/* Portfolio sans broker */}
          {standalonePortfolios.map((portfolio) => (
            <PortfolioCard key={portfolio.id} portfolio={portfolio} onChange={handlePortfolioChange} />
          ))}
        </div>
      )}
    </div>
  );
}
