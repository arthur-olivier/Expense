"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

import {
  updatePortfolioOpenedAt,
  getPortfolioOpenedAtMax,
} from "@/actions/portfolio/portfolios.actions";
import type { Portfolio } from "@/types/portfolio";

import Modal from "@/components/shared/Modal";
import { DatePicker } from "@/components/shared/DatePicker";
import { Label } from "@/components/ui/label";

export default function EditPortfolioDialog({
  portfolio,
  onUpdated,
}: {
  portfolio: Portfolio;
  onUpdated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [openedAt, setOpenedAt] = useState<Date | undefined>(new Date(portfolio.openedAt));
  //Borne haute du picker (aujourd'hui ou 1er mouvement), chargée à l'ouverture
  const [maxDate, setMaxDate] = useState<Date | undefined>(undefined);

  const isPea = portfolio.type === "PEA";

  function handleOpen() {
    //Repart de la valeur courante, le portefeuille peut avoir changé entre 2 ouvertures
    setOpenedAt(new Date(portfolio.openedAt));
    setMaxDate(undefined);
    setOpen(true);
    getPortfolioOpenedAtMax(portfolio.id)
      .then(setMaxDate)
      .catch(() => toast.error("Impossible de charger les bornes de date."));
  }

  function handleSubmit() {
    if (!openedAt) {
      toast.error("Renseigne une date d'ouverture.");
      return;
    }

    startTransition(async () => {
      try {
        await updatePortfolioOpenedAt(portfolio.id, openedAt);
        toast.success("Date d'ouverture mise à jour");
        setOpen(false);
        onUpdated();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Modification impossible.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Modifier le portefeuille"
        title="Modifier la date d'ouverture"
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-foreground"
      >
        <Pencil className="size-3.5" />
      </button>

      <Modal
        title={`Modifier « ${portfolio.name} »`}
        open={open}
        confirmLabel={isPending ? "Enregistrement..." : "Enregistrer"}
        onClose={() => setOpen(false)}
        onConfirm={handleSubmit}
      >
        <div className="space-y-2">
          <Label htmlFor="editOpenedAt">Date d&apos;ouverture</Label>
          <DatePicker value={openedAt} onChange={setOpenedAt} maxDate={maxDate} />
          {isPea && (
            <p className="text-xs" style={{ color: "var(--color-text-caption)" }}>
              Détermine l&apos;ancienneté fiscale du PEA (seuil des 5 ans qui fait passer
              l&apos;imposition des plus-values de 30 % à 17,2 %).
            </p>
          )}
        </div>
      </Modal>
    </>
  );
}
