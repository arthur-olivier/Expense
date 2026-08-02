"use client";

import { useState } from "react";
import { Save, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Modal from "@/components/shared/Modal";
import {
  createSimulationSave,
  updateSimulationSave,
  type SimulationParams,
  type SimulationSaveRecord,
  type SimulationType,
} from "@/lib/data/simulateur";

interface SaveSimulationDialogProps {
  type: SimulationType;
  params: SimulationParams;
  editingSave: { id: string; name: string } | null; // set quand l'onglet vient d'une sauvegarde ouverte
  disabled?: boolean;
  onSaved: (record: SimulationSaveRecord) => void;
}

// boutons d'enregistrement. sauvegarde ouverte : maj directe (sans redemander le nom) + créer une nouvelle. sinon : juste créer
export function SaveSimulationDialog({ type, params, editingSave, disabled, onSaved }: SaveSimulationDialogProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [updating, setUpdating] = useState(false);

  // maj de la sauvegarde en cours, garde le nom, sans modale
  async function handleUpdate() {
    if (!editingSave) return;
    setUpdating(true);
    try {
      const record = await updateSimulationSave(editingSave.id, { name: editingSave.name, params });
      onSaved(record);
      toast.success("Sauvegarde mise à jour");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de mettre à jour la sauvegarde.");
    } finally {
      setUpdating(false);
    }
  }

  // crée une sauvegarde à partir du nom saisi
  async function handleCreate() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Donne un nom à ta sauvegarde.");
      return;
    }
    try {
      const record = await createSimulationSave({ type, name: trimmed, params });
      onSaved(record);
      toast.success("Simulation enregistrée");
      setDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'enregistrer la simulation.");
    }
  }

  // ouvre la modale de nommage
  function openCreateDialog() {
    setName("");
    setDialogOpen(true);
  }

  return (
    <div className="space-y-2">
      {editingSave ? (
        <>
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            disabled={disabled || updating}
            onClick={handleUpdate}
          >
            <Save size={14} />
            Mettre à jour la sauvegarde
          </Button>
          <Button variant="ghost" size="sm" className="w-full gap-2" disabled={disabled} onClick={openCreateDialog}>
            <Plus size={14} />
            Ajouter comme nouvelle sauvegarde
          </Button>
        </>
      ) : (
        <Button variant="outline" size="sm" className="w-full gap-2" disabled={disabled} onClick={openCreateDialog}>
          <Save size={14} />
          Enregistrer la simulation
        </Button>
      )}

      <Modal
        title="Enregistrer la simulation"
        open={dialogOpen}
        confirmLabel="Enregistrer"
        onClose={() => setDialogOpen(false)}
        onConfirm={handleCreate}
      >
        <div className="space-y-2">
          <Label htmlFor="save-name">Nom de la sauvegarde</Label>
          <Input
            id="save-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex : Épargne retraite"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
        </div>
      </Modal>
    </div>
  );
}
