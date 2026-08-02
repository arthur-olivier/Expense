"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, PiggyBank } from "lucide-react";

import { deleteRevenu } from "@/lib/data/charges/revenus";
import { deleteDepense } from "@/lib/data/charges/depenses";
import { deleteInvestment } from "@/lib/data/charges/investments";
import RevenuModal from "@/components/features/charges/RevenuModal";
import DepenseModal from "@/components/features/charges/DepenseModal";
import InvestmentModal from "@/components/features/charges/InvestmentModal";
import ExportDialog from "@/components/features/charges/ExportDialog";
import RevenusTable from "@/components/features/charges/RevenusTable";
import DepensesTable from "@/components/features/charges/DepensesTable";
import PlacementsTable from "@/components/features/charges/PlacementsTable";
import CollapsibleSection from "@/components/shared/CollapsibleSection";
import MonthYearPicker from "@/components/shared/MonthYearPicker";
import PageGuide from "@/components/shared/PageGuide";
import MobileNavDrawer from "@/components/shared/MobileNavDrawer";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/utils";
import type { Revenu, Depense, Investment } from "@/types/finance";

interface ChargesClientProps {
  year: number;
  month: number;
  initialRevenus: Revenu[];
  initialDepenses: Depense[];
  initialInvestments: Investment[];
}

export default function ChargesClient({ year, month, initialRevenus, initialDepenses, initialInvestments }: ChargesClientProps) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();

  // listes seedées du serveur puis maintenues en local, pas de refetch
  const [revenus, setRevenus] = useState<Revenu[]>(initialRevenus);
  const [depenses, setDepenses] = useState<Depense[]>(initialDepenses);
  const [investments, setInvestments] = useState<Investment[]>(initialInvestments);

  // collapse des tableaux
  const [revenusCollapse, setRevenusCollapse] = useState(true);
  const [depensesCollapse, setDepensesCollapse] = useState(true);
  const [investmentsCollapse, setInvestmentsCollapse] = useState(true);

  //Modal
  const [revenuModal, setRevenuModal] = useState<{ open: boolean; item?: Revenu }>({ open: false });
  const [depenseModal, setDepenseModal] = useState<{ open: boolean; item?: Depense }>({
    open: false,
  });
  const [investmentModal, setInvestmentModal] = useState<{ open: boolean; item?: Investment }>({
    open: false,
  });

  // est-on sur un mois passé
  const now = new Date();
  const isPastMonth = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth());

  // changement de mois/année
  function handleMonthChange(y: number, m: number) {
    startNavigation(() => {
      router.push(`/charges?year=${y}&month=${m}`);
    });
  }

  async function handleDeleteRevenu(id: number) {
    const result = await deleteRevenu(id);
    if (result.success) {
      setRevenus((prev) => prev.filter((r) => r.id !== id));
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }

  async function handleDeleteDepense(id: number) {
    const result = await deleteDepense(id);
    if (result.success) {
      setDepenses((prev) => prev.filter((d) => d.id !== id));
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }

  async function handleDeleteInvestment(id: number) {
    const result = await deleteInvestment(id);
    if (result.success) {
      setInvestments((prev) => prev.filter((i) => i.id !== id));
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  }

  // totaux + reste à vivre
  const totalRevenus = revenus.reduce((sum, r) => sum + r.amount, 0);
  const totalDepenses = depenses.reduce((sum, d) => sum + d.amount, 0);
  const totalInvestments = investments.reduce((sum, i) => sum + i.amount, 0);
  const resteAVivre = totalRevenus - totalDepenses - totalInvestments;
  const isPositive = resteAVivre >= 0;

  return (
    <div className={`space-y-7 ${isNavigating ? "opacity-60 transition-opacity" : ""}`}>
      {/* Header — sur mobile : titre+avatar, puis boutons (export/mois), puis la bannière ; desktop inchangé (contents) */}
      <div className="flex flex-col gap-4 md:ml-2 md:flex-row md:items-center md:justify-between">
        {/* Partie de gauche */}
        <div className="contents md:flex md:flex-col md:gap-3">
          <div className="order-1 flex items-start justify-between gap-2 md:order-none md:ml-2">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                  Charges mensuelles
                </h1>
                <PageGuide pageKey="charges" autoOpen={revenus.length === 0 && depenses.length === 0 && investments.length === 0} />
              </div>
              <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
                Revenus, dépenses et placements du mois
              </p>
            </div>
            {/* avatar en haut à droite sur mobile */}
            <div className="md:hidden">
              <MobileNavDrawer />
            </div>
          </div>

          {/* Reste à vivre (bannière) — passe après les boutons sur mobile */}
          <div
            className="order-3 flex w-full items-center justify-between gap-4 rounded-xl px-5 py-3 md:order-none md:w-fit md:justify-start"
            style={{
              background: isPositive ? "var(--color-success-bg)" : "var(--color-danger-bg)",
            }}
          >
            <span className="text-sm font-medium" style={{ color: isPositive ? "var(--color-success)" : "var(--color-danger)" }}>
              Reste à vivre à la fin du mois
            </span>
            <span className="text-sm font-bold" style={{ color: isPositive ? "var(--color-success)" : "var(--color-danger)" }}>
              {formatEUR(resteAVivre)}
            </span>
          </div>
        </div>

        {/* Partie de droite : boutons export + mois */}
        <div className="contents md:flex md:flex-col md:items-end md:gap-2 md:mr-20">
          <div className="order-2 flex items-center justify-end gap-3 md:order-none md:w-full">
            <ExportDialog year={year} month={month} />
            <MonthYearPicker year={year} month={month} onChange={handleMonthChange} />
          </div>
          <p className={`order-4 text-xs font-medium md:order-none ${isPastMonth ? "" : "hidden md:invisible md:block"}`} style={{ color: "var(--color-warning)" }}>
            Mois passé · lecture seule
          </p>
        </div>
      </div>

      {/* Revenus */}
      <CollapsibleSection
        open={revenusCollapse}
        onOpenChange={setRevenusCollapse}
        header={
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--color-success-bg)" }}>
                <TrendingUp size={14} style={{ color: "var(--color-success)" }} />
              </div>
              <h2 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                Revenus
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold" style={{ color: "var(--color-success)" }}>
                +{formatEUR(totalRevenus)}
              </span>
              {!isPastMonth && <Button onClick={() => setRevenuModal({ open: true })}>Ajouter</Button>}
            </div>
          </>
        }
      >
        <RevenusTable
          revenus={revenus}
          isPastMonth={isPastMonth}
          onEdit={(r) => setRevenuModal({ open: true, item: r })}
          onDelete={handleDeleteRevenu}
        />
      </CollapsibleSection>

      {/* Dépenses */}
      <CollapsibleSection
        open={depensesCollapse}
        onOpenChange={setDepensesCollapse}
        header={
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--color-danger-bg)" }}>
                <TrendingDown size={14} style={{ color: "var(--color-danger)" }} />
              </div>
              <h2 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                Dépenses
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold" style={{ color: "var(--color-danger)" }}>
                -{formatEUR(totalDepenses)}
              </span>
              {!isPastMonth && <Button onClick={() => setDepenseModal({ open: true })}>Ajouter</Button>}
            </div>
          </>
        }
      >
        <DepensesTable
          depenses={depenses}
          isPastMonth={isPastMonth}
          onEdit={(d) => setDepenseModal({ open: true, item: d })}
          onDelete={handleDeleteDepense}
        />
      </CollapsibleSection>

      {/* Placements */}
      <CollapsibleSection
        open={investmentsCollapse}
        onOpenChange={setInvestmentsCollapse}
        header={
          <>
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: "var(--color-investment-bg)" }}>
                <PiggyBank size={14} style={{ color: "var(--color-investment)" }} />
              </div>
              <h2 className="text-sm font-bold" style={{ color: "var(--color-text-primary)" }}>
                Placements
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold" style={{ color: "var(--color-investment)" }}>
                {formatEUR(totalInvestments)}
              </span>
              {!isPastMonth && <Button onClick={() => setInvestmentModal({ open: true })}>Ajouter</Button>}
            </div>
          </>
        }
      >
        <PlacementsTable investments={investments} isPastMonth={isPastMonth} onDelete={handleDeleteInvestment} />
      </CollapsibleSection>

      <RevenuModal
        revenu={revenuModal.item}
        open={revenuModal.open}
        year={year}
        month={month}
        onClose={() => setRevenuModal({ open: false })}
        onAdd={(r) => setRevenus((prev) => [...prev, r])}
        onUpdate={(r) => setRevenus((prev) => prev.map((x) => (x.id === r.id ? r : x)))}
      />
      <DepenseModal
        depense={depenseModal.item}
        open={depenseModal.open}
        year={year}
        month={month}
        onClose={() => setDepenseModal({ open: false })}
        onAdd={(d) => setDepenses((prev) => [...prev, d])}
        onUpdate={(d) => setDepenses((prev) => prev.map((x) => (x.id === d.id ? d : x)))}
      />
      <InvestmentModal
        investment={investmentModal.item}
        open={investmentModal.open}
        year={year}
        month={month}
        onClose={() => setInvestmentModal({ open: false })}
        onAdd={(inv) => setInvestments((prev) => [...prev, inv])}
        onUpdate={(inv) => setInvestments((prev) => prev.map((x) => (x.id === inv.id ? inv : x)))}
      />
    </div>
  );
}
