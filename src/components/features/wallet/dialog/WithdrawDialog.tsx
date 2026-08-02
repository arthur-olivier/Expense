"use client";

import { useState } from "react";
import Modal from "@/components/shared/Modal";
import GenericSelect from "@/components/shared/GenericSelect";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatEUR } from "@/lib/utils";
import type { WalletCategory } from "@/types/wallet";

// autre compte pour la sélection
type OtherWallet = {
  id: string;
  name: string;
  categories: WalletCategory[];
};

type Props = {
  open: boolean;
  walletName: string;
  categories: WalletCategory[];
  otherWallets: OtherWallet[];
  onClose: () => void;
  onConfirm: (data: {
    categoryId: string;
    amount: number;
    label: string;
    withdrawToOther: boolean;
    targetCategoryId: string;
  }) => Promise<void> | void;
};

export default function WithdrawDialog({ open, walletName, categories, otherWallets, onClose, onConfirm }: Props) {
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [label, setLabel] = useState("");
  const [withdrawToOther, setWithdrawToOther] = useState(false);
  const [targetWalletId, setTargetWalletId] = useState("");
  const [targetCategoryId, setTargetCategoryId] = useState("");

  const targetWallet = otherWallets.find((w) => w.id === targetWalletId);

  async function handleConfirm() {
    await onConfirm({
      categoryId,
      amount: Number(amount),
      label,
      withdrawToOther,
      targetCategoryId,
    });
  }

  return (
    <Modal
      title={`Retirer de l'argent — ${walletName}`}
      open={open}
      confirmLabel={withdrawToOther ? "Virer" : "Retirer"}
      onClose={onClose}
      onConfirm={handleConfirm}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Poche source</Label>
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
          <Label htmlFor="withdraw-amount">Montant</Label>
          <Input
            id="withdraw-amount"
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="withdraw-label">Libellé</Label>
          <Input
            id="withdraw-label"
            placeholder="Achat voiture"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Virer vers un autre compte</Label>
          <Switch
            checked={withdrawToOther}
            onCheckedChange={(v) => {
              setWithdrawToOther(v);
              setTargetWalletId("");
              setTargetCategoryId("");
            }}
          />
        </div>

        {withdrawToOther && (
          <>
            <div className="space-y-2">
              <Label>Compte destination</Label>
              <GenericSelect
                items={otherWallets}
                value={targetWalletId}
                onValueChange={(v) => {
                  setTargetWalletId(v);
                  setTargetCategoryId("");
                }}
                getValue={(w) => w.id}
                getLabel={(w) => w.name}
                placeholder="Choisir un compte"
              />
            </div>

            {targetWalletId && (
              <div className="space-y-2">
                <Label>Poche destination</Label>
                <GenericSelect
                  items={targetWallet?.categories ?? []}
                  value={targetCategoryId}
                  onValueChange={setTargetCategoryId}
                  getValue={(c) => c.id}
                  getLabel={(c) => `${c.name} — ${formatEUR(c.balance)}`}
                  placeholder="Choisir une poche"
                />
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

export type { OtherWallet };
