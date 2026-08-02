"use client";

import { TrendingUp, Target, FolderOpen, Trash2, Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import ConfirmDeleteDialog from "@/components/shared/ConfirmDeleteDialog";
import { fmt } from "@/lib/calculations/epargne-calculations";
import { deleteSimulationSave, type SimulationSaveRecord } from "@/lib/data/simulateur";

interface SauvegardesTabProps {
  saves: SimulationSaveRecord[];
  onOpen: (save: SimulationSaveRecord) => void;
  onDeleted: (id: string) => void;
}

// liste des simulations enregistrées ; chaque carte peut être rouverte ou supprimée
export function SauvegardesTab({ saves, onOpen, onDeleted }: SauvegardesTabProps) {
  // supprime en base puis retire la carte
  async function handleDelete(id: string) {
    try {
      await deleteSimulationSave(id);
      onDeleted(id);
      toast.success("Sauvegarde supprimée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de supprimer la sauvegarde.");
    }
  }

  if (saves.length === 0) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl p-10 text-center"
        style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}
      >
        <Bookmark size={28} style={{ color: "var(--color-text-muted)" }} />
        <p className="text-sm font-medium" style={{ color: "var(--color-text-primary)" }}>
          Aucune sauvegarde pour l&apos;instant
        </p>
        <p className="max-w-sm text-sm" style={{ color: "var(--color-text-muted)" }}>
          Depuis « Je simule » ou « J&apos;ai un objectif », enregistre une simulation pour la retrouver et la modifier ici.
        </p>
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-2 content-start gap-4 overflow-y-auto pb-2 lg:grid-cols-3">
      {saves.map((save) => (
        <SaveCard key={save.id} save={save} onOpen={() => onOpen(save)} onDelete={() => handleDelete(save.id)} />
      ))}
    </div>
  );
}

// ----------------------- Une carte de sauvegarde

interface SaveCardProps {
  save: SimulationSaveRecord;
  onOpen: () => void;
  onDelete: () => void;
}

function SaveCard({ save, onOpen, onDelete }: SaveCardProps) {
  const isObjectif = save.type === "objectif";
  const Icon = isObjectif ? Target : TrendingUp;
  const typeLabel = isObjectif ? "J'ai un objectif" : "Je simule";

  // résumé des params selon le type
  const summary = isObjectif
    ? `Objectif ${fmt(save.objectif)} · Départ ${fmt(save.depart)}`
    : `Départ ${fmt(save.depart)} · ${fmt(save.mensuel)}/mois`;

  return (
    <div
      className="flex flex-col gap-3 rounded-2xl p-5"
      style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {save.name}
          </p>
          <span
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium"
            style={{ color: "var(--color-investment)" }}
          >
            <Icon size={12} />
            {typeLabel}
          </span>
        </div>
      </div>

      <div className="space-y-1 text-xs" style={{ color: "var(--color-text-muted)" }}>
        <p className="tabular-nums">{summary}</p>
        <p className="tabular-nums">
          {save.duree} an{save.duree > 1 ? "s" : ""} · {save.taux}%
        </p>
      </div>

      <div className="mt-auto flex items-center gap-2 pt-1">
        <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={onOpen}>
          <FolderOpen size={14} />
          Ouvrir
        </Button>
        <ConfirmDeleteDialog
          title="Supprimer la sauvegarde"
          description={`La sauvegarde « ${save.name} » sera définitivement supprimée.`}
          onConfirm={onDelete}
          trigger={
            <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Supprimer">
              <Trash2 className="size-4" style={{ color: "var(--color-danger)" }} />
            </Button>
          }
        />
      </div>
    </div>
  );
}
