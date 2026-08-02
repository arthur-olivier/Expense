// DynamicEntityModal.tsx
// formulaire générique piloté par un schéma : génère les inputs selon field.type, gère validation, défauts et champs conditionnels

"use client";

import { ReactNode, useEffect, useState } from "react";

import Modal from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import GenericSelect from "@/components/shared/GenericSelect";
import InfoTooltip from "@/components/shared/InfoTooltip";
import { DatePicker } from "@/components/shared/DatePicker";

// valeur d'un champ selon field.type
export type FieldValue = string | number | boolean | Date | null | undefined;

// état du form : { nomDuChamp: valeur }, ex { label: "Loyer", amount: 800 }
export type FormValues = Record<string, FieldValue>;

// un champ du formulaire
export type FieldSchema = {
  key: string; // clé dans FormValues
  label: string; // texte au-dessus de l'input
  type: string; // "string" | "number" | "boolean" | "date" | "select"
  required?: boolean; // validation bloquée si vide
  options?: { value: number | string; label: string }[]; // pour type "select"
  defaultValue?: FieldValue; // valeur de départ en création
  showIf?: (form: FormValues) => boolean; // champ conditionnel, masqué si false
  allowNeverDate?: boolean; // DatePicker avec option "jamais"
  minDate?: (form: FormValues) => Date | undefined; // date mini calculée depuis les autres champs
  tooltip?: ReactNode; // "?" d'aide à côté du label
};

type Props = {
  open: boolean;
  title: string;
  schema: FieldSchema[]; // définition des champs
  initialData?: FormValues; // valeurs existantes en édition (absent = création)
  confirmLabel?: string;
  onClose: () => void;
  onSubmit: (data: FormValues) => Promise<void> | void;
};

export default function DynamicEntityModal({
  open,
  title,
  schema,
  initialData,
  onClose,
  onSubmit,
  confirmLabel = "Valider",
}: Props) {
  // form = valeurs saisies, errors = messages d'erreur par champ
  const [form, setForm] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // reset du form à chaque ouverture ou changement de schema/données
  useEffect(() => {
    const defaults: FormValues = {};
    schema.forEach((field) => {
      defaults[field.key] =
        initialData?.[field.key] ?? // édition : valeur existante
        field.defaultValue ?? // sinon défaut du schema
        // sinon valeur vide selon le type
        (field.type === "boolean"
          ? false
          : field.type === "select"
            ? (field.options?.[0]?.value ?? "") // premier choix
            : field.type === "date"
              ? undefined
              : "");
    });
    setForm(defaults);
    setErrors({});
  }, [schema, initialData, open]);

  // maj d'un champ + efface son erreur
  function updateField(key: string, value: FieldValue) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  // vérifie les champs required. le filter est essentiel : un champ masqué par showIf ne doit pas être validé
  function validate() {
    const newErrors: Record<string, string> = {};
    schema
      .filter((field) => !field.showIf || field.showIf(form))
      .forEach((field) => {
        const value = form[field.key];
        if (field.required && (value === "" || value === null || value === undefined)) {
          newErrors[field.key] = `${field.label} est obligatoire`;
        }
      });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // valide puis remonte au parent. si validation KO, on garde la modale ouverte avec les erreurs
  async function handleConfirm() {
    if (!validate()) return;
    await onSubmit(form);
    onClose();
  }

  // choisit l'input selon field.type
  function renderField(field: FieldSchema) {
    const value = form[field.key];

    switch (field.type) {
      case "string":
        return <Input value={value as string} onChange={(e) => updateField(field.key, e.target.value)} />;

      case "number":
        return (
          <Input
            type="number"
            value={value as string | number}
            // Number() car un input HTML renvoie une string
            onChange={(e) => updateField(field.key, Number(e.target.value))}
          />
        );

      case "boolean":
        return (
          <div className="flex items-center justify-between rounded-lg border px-3 py-2">
            <span className="flex items-center gap-1.5 text-sm text-zinc-700">
              {field.label}
              {field.tooltip && <InfoTooltip content={field.tooltip} />}
            </span>
            <Switch checked={!!value} onCheckedChange={(v) => updateField(field.key, v)} />
          </div>
        );

      case "date":
        return (
          <DatePicker
            value={value as Date | undefined}
            onChange={(d) => updateField(field.key, d)}
            allowNever={field.allowNeverDate}
            minDate={field.minDate?.(form)}
          />
        );

      case "select":
        return (
          <GenericSelect
            items={field.options ?? []}
            value={String(value)}
            onValueChange={(v) => updateField(field.key, Number(v))}
            getValue={(opt) => String(opt.value)}
            getLabel={(opt) => opt.label}
          />
        );
    }
  }

  return (
    <Modal title={title} open={open} onClose={onClose} onConfirm={handleConfirm} confirmLabel={confirmLabel}>
      <div className="flex flex-col gap-3">
        {/* seulement les champs dont le showIf passe */}
        {schema
          .filter((field) => !field.showIf || field.showIf(form))
          .map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              {/* le boolean gère son label lui-même */}
              {field.type !== "boolean" && (
                <Label className="flex items-center gap-1.5">
                  {field.label}
                  {field.tooltip && <InfoTooltip content={field.tooltip} />}
                </Label>
              )}
              {renderField(field)}
              {errors[field.key] && <p className="text-xs text-red-500">{errors[field.key]}</p>}
            </div>
          ))}
      </div>
    </Modal>
  );
}
