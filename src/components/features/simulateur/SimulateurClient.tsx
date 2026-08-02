"use client";

import { useState, useCallback } from "react";
import { TrendingUp, Target, Bookmark } from "lucide-react";
import GenericTabs, { type TabItem } from "@/components/shared/GenericTabs";
import { ProjectionTab } from "./ProjectionTab";
import { ObjectifTab } from "./ObjectifTab";
import { SauvegardesTab } from "./SauvegardesTab";
import PageGuide from "@/components/shared/PageGuide";
import MobileNavDrawer from "@/components/shared/MobileNavDrawer";
import type { SimulationSaveRecord } from "@/actions/simulateur.actions";

interface SimulateurClientProps {
  initialPatrimoine: number;
  initialRecurring: number;
  initialSaves: SimulationSaveRecord[];
}

type TabValue = "projection" | "objectif" | "saves";

export default function SimulateurClient({ initialPatrimoine, initialRecurring, initialSaves }: SimulateurClientProps) {
  const [saves, setSaves] = useState(initialSaves);
  const [activeTab, setActiveTab] = useState<TabValue>("projection");

  // preset à charger dans un onglet ; la clé force le remontage pour réinitialiser le form
  const [projectionPreset, setProjectionPreset] = useState<SimulationSaveRecord | null>(null);
  const [projectionKey, setProjectionKey] = useState(0);
  const [objectifPreset, setObjectifPreset] = useState<SimulationSaveRecord | null>(null);
  const [objectifKey, setObjectifKey] = useState(0);

  // insère ou remplace la sauvegarde et la remonte en tête
  const handleSaved = useCallback((record: SimulationSaveRecord) => {
    setSaves((prev) => [record, ...prev.filter((s) => s.id !== record.id)]);
  }, []);

  // retire une sauvegarde supprimée
  const handleDeleted = useCallback((id: string) => {
    setSaves((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // rouvre : injecte en preset de l'onglet d'origine, force le remontage, bascule dessus
  const handleOpen = useCallback((save: SimulationSaveRecord) => {
    if (save.type === "objectif") {
      setObjectifPreset(save);
      setObjectifKey((k) => k + 1);
      setActiveTab("objectif");
    } else {
      setProjectionPreset(save);
      setProjectionKey((k) => k + 1);
      setActiveTab("projection");
    }
  }, []);

  const tabs: TabItem<TabValue>[] = [
    {
      value: "projection",
      label: "Je simule",
      icon: TrendingUp,
      content: (
        <ProjectionTab
          key={`projection-${projectionKey}`}
          initialPatrimoine={initialPatrimoine}
          initialRecurring={initialRecurring}
          preset={projectionPreset}
          onSaved={handleSaved}
        />
      ),
    },
    {
      value: "objectif",
      label: "J'ai un objectif",
      icon: Target,
      content: (
        <ObjectifTab
          key={`objectif-${objectifKey}`}
          initialPatrimoine={initialPatrimoine}
          preset={objectifPreset}
          onSaved={handleSaved}
        />
      ),
    },
    {
      value: "saves",
      label: "Mes sauvegardes",
      icon: Bookmark,
      content: <SauvegardesTab saves={saves} onOpen={handleOpen} onDeleted={handleDeleted} />,
    },
  ];

  return (
    <div className="flex flex-col md:h-full">
      <div className="mb-4 shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
              Simulateur d&apos;épargne
            </h1>
            <PageGuide pageKey="simulateur" />
          </div>
          <MobileNavDrawer />
        </div>
        <p className="mt-0.5 text-xs" style={{ color: "var(--color-text-muted)" }}>
          Visualisez l&apos;effet des intérêts composés sur votre épargne
        </p>
      </div>

      {/* flex-1 min-h-0 : onglets prennent la hauteur restante */}
      <GenericTabs
        tabs={tabs}
        value={activeTab}
        onValueChange={setActiveTab}
        className="gap-0 md:flex-1 md:min-h-0"
        listClassName="mb-6 h-10 w-full max-w-xl p-1"
        contentClassName="md:min-h-0"
      />
    </div>
  );
}
