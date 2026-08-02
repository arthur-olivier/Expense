"use client";

import { useState, useMemo, useCallback } from "react";
import { buildDataPoints, buildScenarios, calcMensuelNecessaire, fmt, toNumber } from "@/lib/calculations/epargne-calculations";
import { AmountField, DurationSlider } from "./SettingsFields";
import { CapitalEvolutionChart } from "./CapitalEvolutionChart";
import { RateScenarioChart } from "./RateScenarioChart";
import { StatsGrid } from "./StatsGrid";
import { PatrimoinePickerDialog } from "./PatrimoinePickerDialog";
import { SaveSimulationDialog } from "./SaveSimulationDialog";
import type { SimulationSaveRecord } from "@/actions/simulateur.actions";

interface ObjectifTabProps {
  initialPatrimoine: number;
  preset?: SimulationSaveRecord | null; // sauvegarde rouverte, sert de valeurs initiales
  onSaved: (record: SimulationSaveRecord) => void;
}

export function ObjectifTab({ initialPatrimoine, preset, onSaved }: ObjectifTabProps) {
  const [objectif, setObjectif] = useState(preset?.objectif ? String(preset.objectif) : "");
  const [depart, setDepart] = useState(preset?.depart ? String(preset.depart) : "");
  const [duree, setDuree] = useState(preset?.duree ?? 10);
  const [taux, setTaux] = useState(preset ? String(preset.taux) : "5");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingSave, setEditingSave] = useState(preset ? { id: preset.id, name: preset.name } : null);

  const objectifNum = toNumber(objectif);
  const departNum = toNumber(depart);
  const tauxNum = toNumber(taux);
  const dejaAtteint = objectifNum > 0 && departNum >= objectifNum;

  // recalcule quand une dépendance change
  const mensuelNecessaire = useMemo(
    () => calcMensuelNecessaire(objectifNum, departNum, duree, tauxNum),
    [objectifNum, departNum, duree, tauxNum],
  );

  const data = useMemo(
    () => buildDataPoints(departNum, mensuelNecessaire, duree, tauxNum),
    [departNum, mensuelNecessaire, duree, tauxNum],
  );
  const scenarios = useMemo(() => buildScenarios(departNum, mensuelNecessaire, duree), [departNum, mensuelNecessaire, duree]);

  // après enregistrement l'onglet suit la sauvegarde pour la maj ensuite
  const handleSaved = useCallback(
    (record: SimulationSaveRecord) => {
      setEditingSave({ id: record.id, name: record.name });
      onSaved(record);
    },
    [onSaved],
  );

  const finalPoint = data[data.length - 1];
  const totalVerse = finalPoint?.verse ?? 0;
  const interetsGeneres = finalPoint?.interets ?? 0;

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

          <AmountField label="Montant cible" value={objectif} onChange={setObjectif} />

          <AmountField
            label="Montant de départ"
            value={depart}
            onChange={setDepart}
            prefillAmount={initialPatrimoine}
            onPrefill={() => setPickerOpen(true)}
            prefillHint={() => "Choisir depuis mes comptes"}
          />

          <DurationSlider value={duree} onChange={setDuree} />

          <AmountField label="Taux de rendement annuel" value={taux} onChange={setTaux} quickAddValues={[-1, 1]} suffix="%" />

          {objectifNum > 0 && (
            <div
              className="rounded-xl p-4"
              style={{
                background: dejaAtteint ? "var(--color-success-bg)" : "var(--color-investment-bg)",
                border: `1px solid ${dejaAtteint ? "var(--color-success)" : "var(--color-investment)"}`,
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-[0.1em] mb-1"
                style={{ color: dejaAtteint ? "var(--color-success)" : "var(--color-investment)" }}
              >
                {dejaAtteint ? "Objectif déjà atteint" : "Versement nécessaire"}
              </p>
              {dejaAtteint ? (
                <p className="text-sm" style={{ color: "var(--color-success)" }}>
                  Votre patrimoine actuel dépasse déjà l&apos;objectif.
                </p>
              ) : (
                <p className="text-3xl font-bold" style={{ color: "var(--color-investment)" }}>
                  {fmt(mensuelNecessaire)}
                  <span className="text-base font-medium">/mois</span>
                </p>
              )}
            </div>
          )}

          <SaveSimulationDialog
            type="objectif"
            params={{ depart: departNum, mensuel: 0, objectif: objectifNum, duree, taux: tauxNum }}
            editingSave={editingSave}
            disabled={objectifNum <= 0}
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
            {objectifNum === 0 ? (
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
                Renseigne un montant cible pour voir la simulation.
              </p>
            ) : dejaAtteint ? (
              <p className="text-sm" style={{ color: "var(--color-success)" }}>
                Ton patrimoine actuel ({fmt(departNum)}) dépasse déjà l&apos;objectif de {fmt(objectifNum)}. Aucun versement
                supplémentaire n&apos;est nécessaire.
              </p>
            ) : (
              <>
                <p className="text-sm mb-4" style={{ color: "var(--color-text-muted)" }}>
                  Pour atteindre{" "}
                  <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {fmt(objectifNum)}
                  </span>{" "}
                  dans{" "}
                  <span className="font-semibold" style={{ color: "var(--color-text-primary)" }}>
                    {duree} an{duree > 1 ? "s" : ""}
                  </span>
                  , tu dois verser{" "}
                  <span className="font-bold text-base" style={{ color: "var(--color-investment)" }}>
                    {fmt(mensuelNecessaire)}/mois
                  </span>
                  .
                </p>
                {/* Statistiques*/}
                <StatsGrid
                  stats={[
                    {
                      label: "Versement mensuel",
                      value: fmt(mensuelNecessaire),
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
              </>
            )}
          </div>
          {/* Evolution du capital*/}
          <CapitalEvolutionChart data={data} gradientId="objectif" />
          {/* Comparatif de scénarios de taux*/}
          <RateScenarioChart data={scenarios} />
        </div>
      </div>

      {/* dialogue de selection parmi le patrimoine */}
      <PatrimoinePickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={(v) => setDepart(String(v))} />
    </>
  );
}
