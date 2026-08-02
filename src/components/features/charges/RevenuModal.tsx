"use client";

import { toast } from "sonner";
import DynamicEntityModal, { type FormValues } from "@/components/shared/DynamicEntityModal";
import { updateRevenu, addRevenu } from "@/lib/data/charges/revenus";
import type { Revenu } from "@/types/finance";

type Props = {
  revenu?: Revenu;
  open: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onAdd: (revenu: Revenu) => void;
  onUpdate: (revenu: Revenu) => void;
};

export default function RevenuModal({ revenu, open, year, month, onClose, onAdd, onUpdate }: Props) {
  const isEdit = !!revenu;

  // schema DynamicEntityModal
  const schema = [
    { key: "label", label: "Nom", type: "string", required: true },
    { key: "amount", label: "Montant", type: "number", required: true },
    {
      key: "date",
      label: "Date",
      type: "date",
      required: true,
    },
    { key: "isRecurring", label: "Revenu récurrent", type: "boolean" },
    {
      key: "dateEndRecurring",
      label: "Fin de la récurrence",
      type: "date",
      required: false,
      showIf: (form: FormValues) => form.isRecurring === true,
      allowNeverDate: true,
      minDate: (form: FormValues) => form.date as Date | undefined,
    },
  ];

  // submit: ajout ou édition
  async function handleSubmit(form: FormValues) {
    const data: Omit<Revenu, "id" | "userId"> = {
      label: form.label as string,
      amount: form.amount as number,
      date: form.date as Date,
      isRecurring: form.isRecurring as boolean,
      dateEndRecurring: form.dateEndRecurring as Date | null,
    };

    if (isEdit && revenu) {
      // edit
      const result = await updateRevenu(revenu.id, data);
      if (result.success) {
        toast.success(result.message);
        onUpdate({ ...revenu, ...data });
      } else {
        toast.error(result.message);
      }
    } else {
      // ajout
      const result = await addRevenu(data);
      if (result.success && result.data) {
        toast.success(result.message);

        // ajoute au tableau si le revenu tombe sur le mois affiché
        const revenuDate = new Date(result.data.date);
        const isInSelectedMonth = revenuDate.getFullYear() === year && revenuDate.getMonth() === month;
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
      title={isEdit ? "Modifier le revenu" : "Ajouter un revenu"}
      confirmLabel={isEdit ? "Modifier" : "Ajouter"}
      schema={schema}
      initialData={revenu}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
}
