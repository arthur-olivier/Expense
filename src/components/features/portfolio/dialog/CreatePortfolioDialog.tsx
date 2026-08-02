"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus } from "lucide-react";

import { createPortfolio } from "@/actions/portfolio/portfolios.actions";
import { createBroker } from "@/actions/portfolio/brokers.actions";
import { PortfolioTypeLabels } from "@/lib/enums";
import type { Broker } from "@/types/portfolio";

import GenericSelect from "@/components/shared/GenericSelect";
import { Button } from "@/components/ui/button";
import Modal from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const NO_BROKER = "__none__";
const NEW_BROKER = "__new__";

type SelectOption = { value: string; label: string };

const portfolioTypeOptions: SelectOption[] = Object.entries(PortfolioTypeLabels).map(
  ([value, label]) => ({
    value,
    label,
  }),
);

export default function CreatePortfolioDialog({
  brokers,
  onCreated,
}: {
  brokers: Broker[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [type, setType] = useState("PEA");
  const [hasOwnCash, setHasOwnCash] = useState(true);
  const [brokerChoice, setBrokerChoice] = useState(NO_BROKER);
  const [newBrokerName, setNewBrokerName] = useState("");
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().slice(0, 10));

  function reset() {
    setName("");
    setType("PEA");
    setBrokerChoice(NO_BROKER);
    setNewBrokerName("");
    setHasOwnCash(true);
    setOpenedAt(new Date().toISOString().slice(0, 10));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function handleCreate() {
    const openedAtDate = new Date(openedAt);

    startTransition(async () => {
      try {
        let brokerId: string | undefined;
        if (brokerChoice === NEW_BROKER) {
          if (!newBrokerName.trim()) {
            toast.error("Donne un nom au courtier.");
            return;
          }
          const res = await createBroker({ name: newBrokerName.trim() });
          if (!res.success || !res.data) {
            toast.error(res.message);
            return;
          }
          brokerId = res.data.id;
        } else if (brokerChoice !== NO_BROKER) {
          brokerId = brokerChoice;
        }

        if (!hasOwnCash && !brokerId) {
          toast.error("Un portefeuille sans cash propre doit être associé à un courtier.");
          return;
        }

        await createPortfolio({ name, type, hasOwnCash, brokerId, openedAt: openedAtDate });
        toast.success("Portefeuille créé");
        setOpen(false);
        reset();
        onCreated();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Impossible de créer le portefeuille.");
      }
    });
  }

  const brokerOptions: SelectOption[] = [
    { value: NO_BROKER, label: "Aucun" },
    ...brokers.map((b) => ({ value: b.id, label: b.name })),
    { value: NEW_BROKER, label: "+ Nouveau courtier" },
  ];

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Nouveau portefeuille
      </Button>

      <Modal
        title="Nouveau portefeuille"
        open={open}
        confirmLabel={isPending ? "Création..." : "Créer"}
        onClose={() => handleOpenChange(false)}
        onConfirm={handleCreate}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              placeholder="Mon PEA"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <GenericSelect
              items={portfolioTypeOptions}
              getValue={(o) => o.value}
              getLabel={(o) => o.label}
              value={type}
              onValueChange={setType}
            />
          </div>
          <div className="space-y-2">
            <Label>Courtier (optionnel)</Label>
            <GenericSelect
              items={brokerOptions}
              getValue={(o) => o.value}
              getLabel={(o) => o.label}
              value={brokerChoice}
              onValueChange={setBrokerChoice}
            />
          </div>
          {brokerChoice === NEW_BROKER && (
            <div className="space-y-2">
              <Label htmlFor="newBrokerName">Nom du courtier</Label>
              <Input
                id="newBrokerName"
                placeholder="Trade Republic"
                value={newBrokerName}
                onChange={(e) => setNewBrokerName(e.target.value)}
                required
              />
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="hasOwnCash">Ce portefeuille a son propre cash</Label>
              <p className="text-xs" style={{ color: "var(--color-text-caption)" }}>
                Désactive si le cash vit chez le courtier (ex. compte-titres partageant le cash du
                courtier).
              </p>
            </div>
            <Switch id="hasOwnCash" checked={hasOwnCash} onCheckedChange={setHasOwnCash} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="openedAt">Date d&apos;ouverture</Label>
            <Input
              id="openedAt"
              type="date"
              value={openedAt}
              onChange={(e) => setOpenedAt(e.target.value)}
              required
            />
          </div>
        </div>
      </Modal>
    </>
  );
}
