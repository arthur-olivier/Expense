"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal";
import GenericSelect from "@/components/shared/GenericSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatEUR } from "@/lib/utils";
import type { WalletCategory } from "@/types/wallet";

type Props = {
  open: boolean;
  walletName: string;
  categories: WalletCategory[];
  onClose: () => void;
  onConfirm: (data: { categoryId: string; amount: number; label: string }) => Promise<void> | void;
};

export default function AddMoneyDialog({ open, walletName, categories, onClose, onConfirm }: Props) {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");

  async function handleConfirm() {
    await onConfirm({ categoryId, amount: Number(amount), label });
  }

  return (
    <Modal
      title={`Ajouter de l'argent — ${walletName}`}
      open={open}
      confirmLabel="Confirmer"
      onClose={onClose}
      onConfirm={handleConfirm}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Poche</Label>
          <GenericSelect
            items={categories}
            value={categoryId}
            onValueChange={setCategoryId}
            getValue={(c) => c.id}
            getLabel={(c) => `${c.name} — ${formatEUR(c.balance)}`}
            placeholder="Choisir une poche"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-amount">Montant</Label>
          <Input
            id="add-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="add-label">Libellé</Label>
          <Input
            id="add-label"
            placeholder="Virement épargne"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>
      </div>
    </Modal>
  );
}
