"use client";

import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";

import {
  listSupportedBrokerProviders,
  previewBrokerImport,
  importBrokerFile,
} from "@/lib/data/portfolio/import";
import { getBrokers } from "@/lib/data/portfolio/brokers";
import { PortfolioTypeLabels } from "@/lib/enums";
import type { Portfolio, Broker } from "@/types/portfolio";

import GenericSelect from "@/components/shared/GenericSelect";
import { Button } from "@/components/ui/button";
import Modal from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const CREATE_NEW_VALUE = "__create__";
const NO_BROKER = "__none__";
const NEW_BROKER = "__new__";

type SelectOption = { value: string; label: string };
type BrokerProvider = { id: string; label: string };

type ImportAccountSummary = {
  accountId: string;
  label: string;
  suggestedType: string;
  suggestedHasOwnCash: boolean;
  count: number;
  earliestDate: Date;
};

type AccountChoice = {
  selection: string;
  createName: string;
  createType: string;
  hasOwnCash: boolean;
};

type ImportAccountResult = {
  accountId: string;
  label: string;
  portfolioName: string;
  imported: number;
  skippedExisting: number;
  unsupported: { date: Date; type: string; description: string }[];
  // Renseigné si l'import a dû ajouter du cash pour éviter un solde négatif :
  //signe que le fichier importé ne couvre pas tout l'historique depuis l'ouverture (voir import.ts)
  adjustment: number | null;
};

const portfolioTypeOptions: SelectOption[] = Object.entries(PortfolioTypeLabels).map(
  ([value, label]) => ({ value, label }),
);

function formatAmount(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function buildDefaultChoice(account: ImportAccountSummary, portfolios: Portfolio[]): AccountChoice {
  const match = portfolios.find(
    (p) => p.type === account.suggestedType || p.name.toLowerCase() === account.label.toLowerCase(),
  );
  return {
    selection: match ? match.id : CREATE_NEW_VALUE,
    createName: account.label,
    createType: account.suggestedType,
    hasOwnCash: account.suggestedHasOwnCash,
  };
}

export default function ImportBrokerDialog({
  portfolios,
  onImported,
}: {
  portfolios: Portfolio[];
  onImported: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [providers, setProviders] = useState<BrokerProvider[]>([]);
  const [providerId, setProviderId] = useState("");
  const [existingBrokers, setExistingBrokers] = useState<Broker[]>([]);
  const [brokerChoice, setBrokerChoice] = useState(NO_BROKER);
  const [newBrokerName, setNewBrokerName] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [accounts, setAccounts] = useState<ImportAccountSummary[] | null>(null);
  const [choices, setChoices] = useState<Record<string, AccountChoice>>({});
  const [results, setResults] = useState<ImportAccountResult[] | null>(null);

  useEffect(() => {
    listSupportedBrokerProviders()
      .then((list) => {
        setProviders(list);
        if (list.length > 0) setProviderId(list[0].id);
      })
      .catch(() => toast.error("Impossible de charger la liste des banques."));
    getBrokers()
      .then(setExistingBrokers)
      .catch(() => toast.error("Impossible de charger tes courtiers."));
  }, []);

  function reset() {
    setFile(null);
    setAccounts(null);
    setChoices({});
    setResults(null);
    setBrokerChoice(NO_BROKER);
    setNewBrokerName("");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      if (results) onImported();
      reset();
    }
  }

  function handleAnalyze() {
    if (!file || !providerId) {
      toast.error("Choisis une banque et un fichier.");
      return;
    }
    startTransition(async () => {
      try {
        const preview = await previewBrokerImport(providerId, file);
        setAccounts(preview.accounts);
        const initial: Record<string, AccountChoice> = {};
        for (const a of preview.accounts) initial[a.accountId] = buildDefaultChoice(a, portfolios);
        setChoices(initial);
        setNewBrokerName(preview.suggestedBrokerName);
        if (preview.accounts.some((a) => !a.suggestedHasOwnCash)) {
          const match = existingBrokers.find((b) => b.name === preview.suggestedBrokerName);
          setBrokerChoice(match ? match.id : NEW_BROKER);
        }
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible de lire ce fichier.");
      }
    });
  }

  function updateChoice(accountId: string, patch: Partial<AccountChoice>) {
    setChoices((prev) => ({ ...prev, [accountId]: { ...prev[accountId], ...patch } }));
  }

  function handleImport() {
    if (!file || !accounts) return;
    const needsBroker = accounts.some(
      (a) => choices[a.accountId] && !choices[a.accountId].hasOwnCash,
    );
    if (needsBroker && brokerChoice === NO_BROKER) {
      toast.error("Au moins un compte n'a pas de cash propre : choisis ou crée un courtier.");
      return;
    }
    if (brokerChoice === NEW_BROKER && !newBrokerName.trim()) {
      toast.error("Donne un nom au courtier.");
      return;
    }

    startTransition(async () => {
      try {
        const mappings = accounts.map((a) => {
          const choice = choices[a.accountId];
          if (choice.selection === CREATE_NEW_VALUE) {
            return {
              accountId: a.accountId,
              createNew: {
                name: choice.createName || a.label,
                type: choice.createType,
                hasOwnCash: choice.hasOwnCash,
              },
            };
          }
          return { accountId: a.accountId, portfolioId: choice.selection };
        });

        const broker =
          brokerChoice === NO_BROKER
            ? {}
            : brokerChoice === NEW_BROKER
              ? { createNew: { name: newBrokerName.trim() } }
              : { brokerId: brokerChoice };

        const res = await importBrokerFile({
          brokerProviderId: providerId,
          file,
          broker,
          mappings,
        });
        setResults(res);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Import impossible.");
      }
    });
  }

  const brokerOptions: SelectOption[] = [
    { value: NO_BROKER, label: "Aucun" },
    ...existingBrokers.map((b) => ({ value: b.id, label: b.name })),
    { value: NEW_BROKER, label: "+ Nouveau courtier" },
  ];

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="size-4" />
        Importer un relevé bancaire
      </Button>

      <Modal
        title="Importer un relevé bancaire"
        open={open}
        className="max-w-10xl"
        confirmLabel={!results ? (isPending ? "Import..." : "Importer") : "Fermer"}
        onClose={() => handleOpenChange(false)}
        onConfirm={!results ? handleImport : () => handleOpenChange(false)}
      >
        {!results ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Banque</Label>
                <GenericSelect
                  items={providers}
                  getValue={(b) => b.id}
                  getLabel={(b) => b.label}
                  value={providerId}
                  onValueChange={setProviderId}
                  placeholder="Choisir une banque"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="broker-file">Fichier export (.xlsx)</Label>
                <Input
                  id="broker-file"
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => {
                    setFile(e.target.files?.[0] ?? null);
                    setAccounts(null);
                    setChoices({});
                  }}
                />
              </div>
            </div>

            {!accounts && (
              <Button
                type="button"
                variant="outline"
                disabled={isPending || !file || !providerId}
                onClick={handleAnalyze}
              >
                {isPending ? "Analyse..." : "Analyser le fichier"}
              </Button>
            )}

            {accounts && (
              <div className="space-y-4">
                <div
                  className="rounded-lg border p-3 space-y-2"
                  style={{ borderColor: "var(--color-border-subtle)" }}
                >
                  <Label>Courtier (regroupe les portefeuilles, porte le cash partagé)</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <GenericSelect
                      items={brokerOptions}
                      getValue={(o) => o.value}
                      getLabel={(o) => o.label}
                      value={brokerChoice}
                      onValueChange={setBrokerChoice}
                    />
                    {brokerChoice === NEW_BROKER && (
                      <Input
                        value={newBrokerName}
                        onChange={(e) => setNewBrokerName(e.target.value)}
                        placeholder="Nom du courtier"
                      />
                    )}
                  </div>
                </div>

                <p className="text-xs" style={{ color: "var(--color-text-caption)" }}>
                  Pour chaque compte détecté, choisis un portefeuille existant ou laisse la création
                  automatique. Les transactions déjà importées ne seront pas dupliquées.
                </p>

                <div className="grid grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {accounts.map((a) => {
                    const choice = choices[a.accountId];
                    if (!choice) return null;
                    const portfolioOptions: SelectOption[] = [
                      { value: CREATE_NEW_VALUE, label: "Créer automatiquement" },
                      ...portfolios.map((p) => ({ value: p.id, label: p.name })),
                    ];
                    return (
                      <div
                        key={a.accountId}
                        className="space-y-2 rounded-lg border p-3"
                        style={{ borderColor: "var(--color-border-subtle)" }}
                      >
                        <p
                          className="text-sm font-medium"
                          style={{ color: "var(--color-text-primary)" }}
                        >
                          {a.label}{" "}
                          <span style={{ color: "var(--color-text-caption)" }}>
                            ({a.count} lignes)
                          </span>
                        </p>

                        <GenericSelect
                          items={portfolioOptions}
                          getValue={(o) => o.value}
                          getLabel={(o) => o.label}
                          value={choice.selection}
                          onValueChange={(v) => updateChoice(a.accountId, { selection: v })}
                        />

                        {choice.selection === CREATE_NEW_VALUE && (
                          <div className="space-y-2">
                            <Input
                              value={choice.createName}
                              onChange={(e) =>
                                updateChoice(a.accountId, { createName: e.target.value })
                              }
                              placeholder="Nom du portefeuille"
                            />
                            <GenericSelect
                              items={portfolioTypeOptions}
                              getValue={(o) => o.value}
                              getLabel={(o) => o.label}
                              value={choice.createType}
                              onValueChange={(v) => updateChoice(a.accountId, { createType: v })}
                            />
                            <div className="flex items-center justify-between">
                              <Label htmlFor={`hasOwnCash-${a.accountId}`} className="text-xs">
                                Cash propre
                              </Label>
                              <Switch
                                id={`hasOwnCash-${a.accountId}`}
                                checked={choice.hasOwnCash}
                                onCheckedChange={(v) =>
                                  updateChoice(a.accountId, { hasOwnCash: v })
                                }
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 py-2">
            {results.map((r) => (
              <div
                key={r.accountId}
                className="space-y-2 rounded-lg border p-3"
                style={{ borderColor: "var(--color-border-subtle)" }}
              >
                <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
                  {r.label} → {r.portfolioName}
                </p>
                <div
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}
                >
                  {r.imported} mouvement{r.imported > 1 ? "s" : ""} importé
                  {r.imported > 1 ? "s" : ""}
                </div>
                {r.skippedExisting > 0 && (
                  <p className="text-xs" style={{ color: "var(--color-text-caption)" }}>
                    {r.skippedExisting} déjà présent{r.skippedExisting > 1 ? "s" : ""}, ignoré
                    {r.skippedExisting > 1 ? "s" : ""}.
                  </p>
                )}
                {r.adjustment !== null && (
                  <div
                    className="rounded-lg px-3 py-2 text-xs"
                    style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)" }}
                  >
                    Solde négatif détecté sur ce compte : {formatAmount(r.adjustment)} ajoutés
                    automatiquement pour éviter un cash négatif. Vérifie que ton export couvre bien
                    tout l&apos;historique depuis l&apos;ouverture du compte, sinon ce montant ne
                    correspond à aucun vrai dépôt.
                  </div>
                )}
                {r.unsupported.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium" style={{ color: "var(--color-warning)" }}>
                      {r.unsupported.length} ligne{r.unsupported.length > 1 ? "s" : ""} non prise
                      {r.unsupported.length > 1 ? "s" : ""} en charge :
                    </p>
                    <div
                      className="max-h-24 space-y-1 overflow-y-auto text-xs"
                      style={{ color: "var(--color-text-caption)" }}
                    >
                      {r.unsupported.map((u, i) => (
                        <p key={i}>
                          {new Date(u.date).toLocaleDateString("fr-FR")} · {u.type} ·{" "}
                          {u.description}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Modal>
    </>
  );
}
