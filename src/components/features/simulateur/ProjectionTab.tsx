"use client";

import { useState, useMemo, useCallback } from "react";
import { buildDataPoints, buildScenarios, fmt, toNumber } from "@/lib/calculations/epargne-calculations";
import { AmountField, DurationSlider } from "./SettingsFields";
import { CapitalEvolutionChart } from "./CapitalEvolutionChart";
import { RateScenarioChart } from "./RateScenarioChart";
import { StatsGrid } from "./StatsGrid";
import { PatrimoinePickerDialog } from "./PatrimoinePickerDialog";
import { SaveSimulationDialog } from "./SaveSimulationDialog";
import type { SimulationSaveRecord } from "@/actions/simulateur.actions";

interface ProjectionTabProps {
  initialPatrimoine: number;
  initialRecurring: number;
  preset?: SimulationSaveRecord | null; // sauvegarde rouverte, sert de valeurs initiales
  onSaved: (record: SimulationSaveRecord) => void;
}

export function ProjectionTab({ initialPatrimoine, initialRecurring, preset, onSaved }: ProjectionTabProps) {
  const [depart, setDepart] = useState(preset?.depart ? String(preset.depart) : "");
  const [mensuel, setMensuel] = useState(preset?.mensuel ? String(preset.mensuel) : "");
  const [duree, setDuree] = useState(preset?.duree ?? 10);
  const [taux, setTaux] = useState(preset ? String(preset.taux) : "5");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingSave, setEditingSave] = useState(preset ? { id: preset.id, name: preset.name } : null);

  const departNum = toNumber(depart);
  const mensuelNum = toNumber(mensuel);
  const tauxNum = toNumber(taux);

  // recalcule quand une dépendance change
  const data = useMemo(() => buildDataPoints(departNum, mensuelNum, duree, tauxNum), [departNum, mensuelNum, duree, tauxNum]);
  const scenarios = useMemo(() => buildScenarios(departNum, mensuelNum, duree), [departNum, mensuelNum, duree]);

  const finalPoint = data[data.length - 1];
  const totalVerse = finalPoint?.verse ?? 0;
  const valeurFinale = finalPoint?.valeur ?? 0;
  const interetsGeneres = finalPoint?.interets ?? 0;

  const prefillMensuel = useCallback(() => setMensuel(String(Math.round(initialRecurring))), [initialRecurring]);

  // après enregistrement l'onglet suit la sauvegarde pour la maj ensuite
  const handleSaved = useCallback(
    (record: SimulationSaveRecord) => {
      setEditingSave({ id: record.id, name: record.name });
      onSaved(record);
    },
    [onSaved],
  );

  return (
    <>
      <div className="flex flex-col gap-4 md:grid md:grid-cols-3 md:gap-6 md:h-full md:min-h-0">
        {/* Selection des paramètres */}
        <div
          className="order-1 rounded-2xl p-5 space-y-5 md:order-none md:p-6"
          style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            Paramètres
          </p>

          <AmountField
            label="Montant de départ"
            value={depart}
            onChange={setDepart}
            prefillAmount={initialPatrimoine}
            onPrefill={() => setPickerOpen(true)}
            prefillHint={() => "Choisir depuis mes comptes"}
          />

          <AmountField
            label="Versement mensuel"
            value={mensuel}
            onChange={setMensuel}
            quickAddValues={[-100, 100]}
            prefillAmount={initialRecurring}
            onPrefill={prefillMensuel}
            prefillHint={(v) => `Placements actuels : ${fmt(v)}/mois`}
          />

          <DurationSlider value={duree} onChange={setDuree} />

          <AmountField label="Taux de rendement annuel" value={taux} onChange={setTaux} quickAddValues={[-1, 1]} suffix="%" />

          <SaveSimulationDialog
            type="projection"
            params={{ depart: departNum, mensuel: mensuelNum, objectif: 0, duree, taux: tauxNum }}
            editingSave={editingSave}
            disabled={departNum <= 0 && mensuelNum <= 0}
            onSaved={handleSaved}
          />
        </div>

        {/* colonne droite : remplit la hauteur dispo, les graphiques (flex-1 min-h-0) se redimensionnent pour éviter le scroll */}
        <div className="order-2 flex flex-col gap-4 md:order-none md:col-span-2 md:min-h-0 md:h-full">
          {/* Haut*/}
          <div
            className="rounded-2xl px-5 py-5 md:px-7"
            style={{
              background: "var(--color-bg-card)",
              boxShadow: "var(--shadow-card-lg)",
              borderTop: "3px solid var(--color-investment)",
            }}
          >
            <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
              Dans{" "}
              <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                {duree} an{duree > 1 ? "s" : ""}
              </span>
              , tu auras versé{" "}
              <span className="font-semibold" style={{ color: "var(--color-text-secondary)" }}>
                {fmt(totalVerse)}
              </span>{" "}
              et ton capital vaudra{" "}
              <span className="font-bold text-base" style={{ color: "var(--color-investment)" }}>
                {fmt(valeurFinale)}
              </span>
              {interetsGeneres > 0 && (
                <>
                  {" "}
                  — soit{" "}
                  <span className="font-semibold" style={{ color: "var(--color-success)" }}>
                    {fmt(interetsGeneres)} d&apos;intérêts générés
                  </span>
                </>
              )}
              .
            </p>
            {/* Statistiques*/}
            <StatsGrid
              stats={[
                {
                  label: "Capital final",
                  value: fmt(valeurFinale),
                  color: "var(--color-investment)",
                },
                {
                  label: "Total versé",
                  value: fmt(totalVerse),
                  color: "var(--color-text-secondary)",
                },
                {
                  label: "Intérêts générés",
                  value: fmt(interetsGeneres),
                  color: "var(--color-success)",
                },
              ]}
            />
          </div>

          {/* Evolution du capital*/}
          <CapitalEvolutionChart data={data} gradientId="projection" />
          {/* Comparatif de scénarios de taux*/}
          <RateScenarioChart data={scenarios} />
        </div>
      </div>

      {/* dialogue de selection parmi le patrimoine */}
      <PatrimoinePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={(v) => setDepart(String(v))} />
    </>
  );
}
