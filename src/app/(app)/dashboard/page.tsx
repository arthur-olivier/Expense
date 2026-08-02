import { getDashboardData } from "@/actions/dashboard.actions";
import { ResteCard } from "@/components/features/dashboard/ResteCard";
import { PatrimoineCard } from "@/components/features/dashboard/PatrimoineCard";
import { DepensesCategorieCard } from "@/components/features/dashboard/DepensesCategorieCard";
import { RepartitionComptesCard } from "@/components/features/dashboard/RepartitionComptesCard";
import { RepartitionPochesCard } from "@/components/features/dashboard/RepartitionPochesCard";
import { APreleverCard } from "@/components/features/dashboard/APreleverCard";
import { InvestissementsRecurrentsCard } from "@/components/features/dashboard/InvestissementsRecurrentsCard";
import PageGuide from "@/components/shared/PageGuide";
import MobileNavDrawer from "@/components/shared/MobileNavDrawer";

export default async function DashboardPage() {
  const data = await getDashboardData();

  const today = new Date();
  const monthLabel = today.toLocaleString("fr-FR", { month: "long", year: "numeric" });
  // aucune donnée : on ouvre le guide une fois
  const isEmpty =
    data.totalRevenus === 0 && data.totalDepenses === 0 && data.totalInvestments === 0 && data.totalPatrimoine === 0;

  return (
    <div>
      {/* en-tête : titre + bandeau du mois (décoratif) */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Tableau de bord
            </h1>
            <PageGuide pageKey="dashboard" autoOpen={isEmpty} />
          </div>
          <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-caption)" }}>
            Mis à jour à l&apos;instant
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1 rounded-lg border px-1 py-1"
            style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border-default)" }}
          >
            <span className="px-2 text-[13px] font-medium capitalize" style={{ color: "var(--color-text-primary)" }}>
              {monthLabel}
            </span>
          </div>
          <MobileNavDrawer />
        </div>
      </div>

      {/* rang 1 : reste du mois (large) + patrimoine */}
      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <ResteCard
          reste={data.resteFinDuMois}
          revenus={data.totalRevenus}
          depenses={data.totalDepenses}
          placements={data.totalInvestments}
          evolution={data.evolutionReste}
        />
        <PatrimoineCard
          totalPatrimoine={data.totalPatrimoine}
          totalLiquide={data.totalLiquide}
          totalLocked={data.totalLocked}
          totalPatrimoineBoursier={data.totalPatrimoineBoursier}
          patrimoineEvolution={data.patrimoineEvolution}
        />
      </div>

      {/* rang 2 : répartitions catégorie / compte / poche */}
      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <DepensesCategorieCard depensesParCategorie={data.depensesParCategorie} />
        <RepartitionComptesCard accountSlices={data.accountSlices} totalPatrimoine={data.totalPatrimoine} />
        <RepartitionPochesCard categorySlices={data.categorySlices} totalPatrimoine={data.totalPatrimoine} />
      </div>

      {/* rang 3 : échéances du mois + placements automatiques */}
      <div className="grid gap-4 md:grid-cols-2">
        <APreleverCard
          depensesRestantes={data.depensesRestantes}
          investmentsRestants={data.investmentsRestants}
          totalAPrelever={data.totalAPrelever}
        />
        <InvestissementsRecurrentsCard
          activeInvestments={data.activeInvestments}
          totalRecurringMonthly={data.totalRecurringMonthly}
        />
      </div>
    </div>
  );
}
