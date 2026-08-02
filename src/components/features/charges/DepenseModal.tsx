"use client";

import { toast } from "sonner";
import DynamicEntityModal from "@/components/shared/DynamicEntityModal";
import { updateDepense, addDepense } from "@/actions/charges/depenses.actions";
import { CategoryDepense, TypeDepense, CategoryLabels, TypeLabels } from "@/lib/enums";
import type { Depense } from "@/types/finance";

type Props = {
  depense?: Depense;
  open: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onAdd: (depense: Depense) => void;
  onUpdate: (depense: Depense) => void;
};

export default function DepenseModal({ depense, open, year, month, onClose, onAdd, onUpdate }: Props) {
  const isEdit = !!depense;

  // schema DynamicEntityModal
  const schema = [
    { key: "label", label: "Label", type: "string", required: true },
    { key: "amount", label: "Montant", type: "number", required: true },
    {
      key: "date",
      label: "Date",
      type: "date",
      required: true,
    },
    { key: "isRecurring", label: "Dépense récurrente", type: "boolean" },
    {
      key: "dateEndRecurring",
      label: "Fin de la récurrence",
      type: "date",
      required: false,
      showIf: (form: Record<string, any>) => form.isRecurring === true,
      allowNeverDate: true,
      minDate: (form: Record<string, any>) => form.date,
    },
    {
      key: "category",
      label: "Catégorie",
      type: "select",
      defaultValue: CategoryDepense.Autre,
      options: Object.entries(CategoryLabels).map(([value, label]) => ({
        value: Number(value),
        label,
      })),
    },
  ];

  // submit: ajout ou édition
  async function handleSubmit(form: Record<string, any>) {
    const data: Omit<Depense, "id" | "userId"> = {
      label: form.label,
      amount: form.amount,
      date: form.date,
      isRecurring: form.isRecurring,
      dateEndRecurring: form.dateEndRecurring,
      category: form.category,
    };

    if (isEdit && depense) {
      // edit
      const result = await updateDepense(depense.id, data);
      if (result.success) {
        toast.success(result.message);
        onUpdate({ ...depense, ...data });
      } else {
        toast.error(result.message);
      }
    } else {
      // ajout
      const result = await addDepense(data);
      if (result.success && result.data) {
        toast.success(result.message);

        // ajoute au tableau si la dépense tombe sur le mois affiché
        const depenseDate = new Date(result.data.date);
        const isInSelectedMonth = depenseDate.getFullYear() === year && depenseDate.getMonth() === month;
        if (isInSelectedMonth || result.data.isRecurring) {
          onAdd(result.data);
        }
      } else {
        toast.error(result.message);
      }
    }
  }

  return (
    <DynamicEntityModal
      open={open}
      title={isEdit ? "Modifier la dépense" : "Ajouter une dépense"}
      confirmLabel={isEdit ? "Modifier" : "Ajouter"}
      schema={schema}
      initialData={depense}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
}
