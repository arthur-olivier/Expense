"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { addInvestment, updateInvestment } from "@/actions/charges/investments.actions";
import { getWallets } from "@/actions/wallet.actions";
import Modal from "@/components/shared/Modal";
import InformationDialog from "@/components/shared/InformationDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/shared/DatePicker";
import GenericSelect from "@/components/shared/GenericSelect";
import type { Investment } from "@/types/finance";

// type du wallet dérivé du retour serveur, pas de duplication
type WalletWithCategories = Awaited<ReturnType<typeof getWallets>>[number];

// données validées en attente de confirmation
type PendingData = {
  accountId: string;
  categoryId: string | null;
  label: string;
  amount: number;
  date: Date;
  isRecurring: boolean;
  dateEndRecurring: Date | null;
};

type Props = {
  investment?: Investment; // présent = édition, absent = création
  open: boolean;
  year: number;
  month: number;
  onClose: () => void;
  onAdd: (investment: Investment) => void;
  onUpdate: (investment: Investment) => void;
};

export default function InvestmentModal({ investment, open, year, month, onClose, onAdd, onUpdate }: Props) {
  const isEdit = !!investment;
  const prevOpenRef = useRef(false);

  // comptes dispo + données en attente
  const [wallets, setWallets] = useState<WalletWithCategories[]>([]);
  const [pendingData, setPendingData] = useState<PendingData | null>(null);

  // champs du placement
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState<Date | undefined>();
  const [isRecurring, setIsRecurring] = useState(false);
  const [dateEndRecurring, setDateEndRecurring] = useState<Date | undefined>();

  //Erreurs
  const [errors, setErrors] = useState<Record<string, string>>({});

  // poches dépendent du compte choisi
  const selectedWallet = wallets.find((w) => w.id === accountId);
  const availableCategories = selectedWallet?.categories ?? [];

  // à l'ouverture: charge wallets + reset form; prevOpenRef évite de reset à chaque render et d'écraser la saisie
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      getWallets().then(setWallets);
      setAccountId(investment?.accountId ?? "");
      setCategoryId(investment?.categoryId ?? "");
      setLabel(investment?.label ?? "");
      setAmount(investment?.amount?.toString() ?? "");
      setDate(investment?.date ? new Date(investment.date) : undefined);
      setIsRecurring(investment?.isRecurring ?? false);
      setDateEndRecurring(investment?.dateEndRecurring ? new Date(investment.dateEndRecurring) : undefined);
      setErrors({});
    }
    prevOpenRef.current = open;
  }, [open]);

  // changer de compte invalide la poche; en édition on garde la poche au 1er rendu
  useEffect(() => {
    if (!isEdit) {
      setCategoryId("");
    }
    setErrors((prev) => ({ ...prev, categoryId: "" }));
  }, [accountId]);

  // valide les champs requis, remplit errors, retourne true si ok
  function validate() {
    const newErrors: Record<string, string> = {};
    if (!label.trim()) newErrors.label = "Label est obligatoire";
    if (!amount || Number(amount) <= 0) newErrors.amount = "Montant est obligatoire";
    if (!date) newErrors.date = "Date est obligatoire";
    if (!accountId) newErrors.accountId = "Compte est obligatoire";
    if (accountId && !categoryId) newErrors.categoryId = "Poche est obligatoire";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // étape 1: valide et met en attente, ouvre la confirmation car un placement déplace de l'argent
  function handleConfirm() {
    if (!validate()) return;

    setPendingData({
      accountId,
      categoryId: categoryId || null,
      label: label.trim(),
      amount: Number(amount),
      date: date!,
      isRecurring,
      dateEndRecurring: isRecurring ? (dateEndRecurring ?? null) : null,
    });
  }

  // étape 2: appelle l'action serveur puis remonte au parent
  async function handleFinalConfirm() {
    if (!pendingData) return;

    if (isEdit && investment) {
      // edit
      const result = await updateInvestment(investment.id, pendingData);
      if (result.success) {
        toast.success(result.message);
        // reconstruit l'objet en local
        onUpdate({
          ...investment,
          ...pendingData,
          account: (wallets.find((w) => w.id === pendingData.accountId) ?? investment.account) as Investment["account"],
          category: availableCategories.find((c) => c.id === pendingData.categoryId) ?? null,
        });
        setPendingData(null);
        onClose();
      } else {
        toast.error(result.message);
      }
    } else {
      // ajout
      const result = await addInvestment(pendingData);
      if (result.success && result.data) {
        toast.success(result.message);
        // ajoute à la liste seulement si mois affiché ou récurrent
        const investmentDate = new Date(result.data.date);
        const isInSelectedMonth = investmentDate.getFullYear() === year && investmentDate.getMonth() === month;
        if (isInSelectedMonth || result.data.isRecurring) {
          onAdd(result.data);
        }
        setPendingData(null);
        onClose();
      } else {
        toast.error(result.message);
      }
    }
  }

  // récap affiché dans la confirmation
  function buildConfirmContent(data: PendingData) {
    const amountStr = data.amount.toLocaleString("fr-FR", {
      style: "currency",
      currency: "EUR",
    });
    const dateStr = data.date.toLocaleDateString("fr-FR");
    const pocheName = availableCategories.find((c) => c.id === data.categoryId)?.name ?? "—";
    const walletName = wallets.find((w) => w.id === data.accountId)?.name ?? "—";

    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-zinc-50 px-4 py-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Montant</span>
            <span className="font-semibold text-zinc-900">{amountStr}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Compte</span>
            <span className="font-medium text-zinc-900">{walletName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Poche</span>
            <span className="font-medium text-zinc-900">{pocheName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500">Date effective</span>
            <span className="font-medium text-zinc-900">{dateStr}</span>
          </div>
          {data.isRecurring && (
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Récurrence</span>
              <span className="font-medium text-zinc-900">
                Mensuelle
                {data.dateEndRecurring ? ` jusqu'au ${data.dateEndRecurring.toLocaleDateString("fr-FR")}` : " · sans limite"}
              </span>
            </div>
          )}
        </div>
        <p className="text-xs text-zinc-400">
          {data.isRecurring
            ? `Les fonds seront automatiquement ajoutés à la poche "${pocheName}" chaque mois à partir du ${dateStr}.`
            : `Les fonds seront ajoutés à la poche "${pocheName}" le ${dateStr}.`}
        </p>
        {data.date < new Date() && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
            <p className="text-xs font-medium text-amber-700">
              La date sélectionnée est dans le passé.{" "}
              {data.isRecurring
                ? `Les transactions manquantes depuis le ${dateStr} jusqu'à aujourd'hui seront générées immédiatement.`
                : `Le virement de ${amountStr} vers "${pocheName}" sera effectué immédiatement.`}
            </p>
          </div>
        )}
      </div>
    );
  }

  //Page
  return (
    <>
      <Modal
        open={open}
        title={isEdit ? "Modifier le placement" : "Ajouter un placement"}
        confirmLabel={isEdit ? "Modifier" : "Ajouter"}
        onClose={onClose}
        onConfirm={handleConfirm}
      >
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Label</Label>
            <Input
              value={label}
              onChange={(e) => {
                setLabel(e.target.value);
                setErrors((p) => ({ ...p, label: "" }));
              }}
              placeholder="Versement mensuel"
            />
            {errors.label && <p className="text-xs text-red-500">{errors.label}</p>}
          </div>

          <div className="space-y-1">
            <Label>Montant</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setErrors((p) => ({ ...p, amount: "" }));
              }}
            />
            {errors.amount && <p className="text-xs text-red-500">{errors.amount}</p>}
          </div>

          <div className="space-y-1">
            <Label>Date</Label>
            {/* Pas de placement antérieur au 1er du mois en cours */}
            <DatePicker
              value={date}
              onChange={(d) => {
                setDate(d);
                setErrors((p) => ({ ...p, date: "" }));
              }}
              minDate={new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
            />
            {errors.date && <p className="text-xs text-red-500">{errors.date}</p>}
          </div>

          <div className="space-y-1">
            <Label>Compte</Label>
            <GenericSelect
              items={wallets}
              value={accountId}
              onValueChange={(v) => {
                setAccountId(v);
                setErrors((p) => ({ ...p, accountId: "" }));
              }}
              getValue={(w) => w.id}
              getLabel={(w) => w.name}
              placeholder="Choisir un compte"
            />
            {errors.accountId && <p className="text-xs text-red-500">{errors.accountId}</p>}
          </div>

          {/* La poche n'a de sens qu'une fois le compte choisi */}
          {accountId && (
            <div className="space-y-1">
              <Label>Poche</Label>
              <GenericSelect
                items={availableCategories}
                value={categoryId}
                onValueChange={(v) => {
                  setCategoryId(v);
                  setErrors((p) => ({ ...p, categoryId: "" }));
                }}
                getValue={(c) => c.id}
                getLabel={(c) => c.name}
                placeholder="Choisir une poche"
              />
              {errors.categoryId && <p className="text-xs text-red-500">{errors.categoryId}</p>}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Label>Placement récurrent</Label>
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
          </div>

          {isRecurring && (
            <div className="space-y-2">
              <Label>Fin de la récurrence</Label>
              <DatePicker value={dateEndRecurring} onChange={setDateEndRecurring} allowNever minDate={date} />
            </div>
          )}
        </div>
      </Modal>

      {/* 2e modale: s'ouvre dès que pendingData est rempli */}
      <InformationDialog
        open={!!pendingData}
        onOpenChange={(o) => {
          if (!o) setPendingData(null);
        }}
        title="Confirmer le placement"
        cancelLabel="Modifier"
        confirmLabel="Confirmer"
        onConfirm={handleFinalConfirm}
      >
        {pendingData && buildConfirmContent(pendingData)}
      </InformationDialog>
    </>
  );
}
