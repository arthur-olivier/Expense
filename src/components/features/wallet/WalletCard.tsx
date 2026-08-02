"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Lock, Unlock, Pencil, ChevronDown, History } from "lucide-react";
import ActionMenu from "@/components/shared/ActionMenu";

import {
  createCategory,
  updateCategory,
  deleteCategory,
  addMoneyToAccount,
  withdrawMoney,
  withdrawMoneyToOtherAccount,
  transferMoney,
  updateWallet,
  getWallet,
  getWalletTransactions,
  getWallets,
} from "@/lib/data/wallet";
import ConfirmDeleteDialog from "@/components/shared/ConfirmDeleteDialog";
import Modal from "@/components/shared/Modal";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { formatEUR } from "@/lib/utils";
import type { Wallet, WalletCategory } from "@/types/wallet";
import WalletCategoriesSection from "./WalletCategoriesSection";
import AddMoneyDialog from "./dialog/AddMoneyDialog";
import TransferDialog from "./dialog/TransferDialog";
import WithdrawDialog, { type OtherWallet } from "./dialog/WithdrawDialog";
import WalletHistoryDialog, { type WalletTransaction } from "./dialog/WalletHistoryDialog";

const CATEGORY_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#3b82f6",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
  "#ec4899",
  "#84cc16",
];

export default function WalletCard({
  wallet,
  onChange,
  onDelete,
  onRefreshAll,
}: {
  wallet: Wallet;
  onChange: (wallet: Wallet) => void;
  onDelete: (id: string) => void;
  onRefreshAll: () => void;
}) {
  const [open, setOpen] = useState(false);
  // gardé pour les dialogs Add/Withdraw/Transfer qui reçoivent isPending
  const [isPending, startTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(wallet.name);
  const [editIsLocked, setEditIsLocked] = useState(wallet.isLocked);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");

  const [editCategory, setEditCategory] = useState<WalletCategory | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");

  const [addMoneyOpen, setAddMoneyOpen] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [transferOpen, setTransferOpen] = useState(false);

  const [historyOpen, setHistoryOpen] = useState(false);

  const [transactions, setTransactions] = useState<WalletTransaction[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Retrait
  const [otherWallets, setOtherWallets] = useState<OtherWallet[]>([]);

  const pieSlices = wallet.categories
    .filter((c) => c.balance > 0)
    .map((c, i) => ({
      label: c.name,
      value: c.balance,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    }));

  async function refreshWallet() {
    const fresh = await getWallet(wallet.id);
    onChange(fresh);
  }

  function handleOpenHistory() {
    setHistoryOpen(true);
    setLoadingHistory(true);
    getWalletTransactions(wallet.id)
      .then(setTransactions)
      .catch(() => toast.error("Impossible de charger l'historique."))
      .finally(() => setLoadingHistory(false));
  }

  function handleOpenEdit() {
    setEditName(wallet.name);
    setEditIsLocked(wallet.isLocked);
    setEditOpen(true);
  }

  function handleOpenCategoryDialog() {
    setCategoryName("");
    setCategoryDialogOpen(true);
  }

  function handleOpenAddMoney() {
    setAddMoneyOpen(true);
  }

  function handleOpenTransfer() {
    setTransferOpen(true);
  }

  async function handleOpenWithdraw() {
    const all = await getWallets();
    setOtherWallets(all.filter((w) => w.id !== wallet.id) as OtherWallet[]);
    setWithdrawOpen(true);
  }

  // async/await pour garder le bouton désactivé pendant l'action, anti double-clic géré par la Modal
  async function handleUpdate() {
    try {
      const res = await updateWallet(wallet.id, { name: editName, isLocked: editIsLocked });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      await refreshWallet();
      toast.success(res.message);
      setEditOpen(false);
    } catch {
      toast.error("Impossible de modifier le compte.");
    }
  }

  async function handleCreateCategory() {
    try {
      const res = await createCategory(wallet.id, categoryName);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      await refreshWallet();
      toast.success(res.message);
      setCategoryDialogOpen(false);
    } catch {
      toast.error("Impossible de créer la poche.");
    }
  }

  async function handleUpdateCategory() {
    if (!editCategory) return;
    try {
      const res = await updateCategory(editCategory.id, editCategoryName);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      await refreshWallet();
      toast.success(res.message);
      setEditCategory(null);
    } catch {
      toast.error("Impossible de modifier la poche.");
    }
  }

  // via ConfirmDeleteDialog (pas une Modal), d'où startTransition
  function handleDeleteCategory(categoryId: string) {
    startTransition(async () => {
      try {
        const res = await deleteCategory(categoryId);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        await refreshWallet();
        toast.success(res.message);
      } catch {
        toast.error("Impossible de supprimer la poche.");
      }
    });
  }

  // ajoute de l'argent
  async function handleAddMoney(data: { categoryId: string; amount: number; label: string }) {
    try {
      const res = await addMoneyToAccount(wallet.id, data.categoryId, data.amount, data.label);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      await refreshWallet();
      toast.success(res.message);
      setAddMoneyOpen(false);
    } catch {
      toast.error("Opération impossible.");
    }
  }

  async function handleWithdraw(data: {
    categoryId: string;
    amount: number;
    label: string;
    withdrawToOther: boolean;
    targetCategoryId: string;
  }) {
    try {
      if (data.withdrawToOther && data.targetCategoryId) {
        const res = await withdrawMoneyToOtherAccount({
          fromCategoryId: data.categoryId,
          toCategoryId: data.targetCategoryId,
          amount: data.amount,
          label: data.label,
        });
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success(res.message);
        onRefreshAll();
      } else {
        const res = await withdrawMoney(data.categoryId, data.amount, data.label);
        if (!res.success) {
          toast.error(res.message);
          return;
        }
        toast.success(res.message);
      }
      await refreshWallet();
      setWithdrawOpen(false);
    } catch {
      toast.error("Opération impossible.");
    }
  }

  async function handleTransfer(data: { from: string; to: string; amount: number; label: string }) {
    try {
      const res = await transferMoney({
        fromCategoryId: data.from,
        toCategoryId: data.to,
        amount: data.amount,
        label: data.label,
      });
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      await refreshWallet();
      toast.success(res.message);
      setTransferOpen(false);
    } catch {
      toast.error("Transfert impossible.");
    }
  }

  return (
    <Card className="w-full">
      <CardContent className="pt-4">
        {/* Ligne principale */}
        <div className="flex items-center gap-3">
          <p className="min-w-0 truncate font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {wallet.name}
          </p>
          {wallet.isLocked ? (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: "var(--color-warning-bg)", color: "var(--color-warning)" }}
            >
              <Lock className="size-3" /> Bloqué
            </span>
          ) : (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
              style={{ background: "var(--color-success-bg)", color: "var(--color-success)" }}
            >
              <Unlock className="size-3" /> Disponible
            </span>
          )}
          <div className="flex-1" />
          <p className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>
            {formatEUR(wallet.balance)}
          </p>
          {/* Modification d'un compte */}
          <ActionMenu items={[{ label: "Modifier", icon: Pencil, onClick: handleOpenEdit }]} />
          {/* Suppression d'un compte */}
          <ConfirmDeleteDialog
            title={`Supprimer ${wallet.name} ?`}
            description={
              wallet.balance !== 0
                ? `Ce compte contient encore ${formatEUR(wallet.balance)}. Toutes les poches et transactions associées seront supprimées définitivement.`
                : "Toutes les poches et transactions associées seront supprimées définitivement."
            }
            onConfirm={() => onDelete(wallet.id)}
          />
        </div>

        {/* Boutons dérouler / historique */}
        <div className="mt-3 flex gap-2">
          {/* Bouton Poches/Reduire */}
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed py-1.5 text-xs font-medium text-muted-foreground hover:bg-slate-50"
          >
            <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
            {open ? "Réduire" : "Poches"}
          </button>
          {/* Bouton historique */}
          <button
            type="button"
            onClick={handleOpenHistory}
            className="flex items-center justify-center gap-1.5 rounded-md border border-dashed px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-slate-50"
          >
            <History className="size-3.5" /> Historique
          </button>
        </div>

        {/* Categories d'un compte + Boutons poche/transferer/ajouter/retirer*/}
        {open && (
          <WalletCategoriesSection
            categories={wallet.categories}
            pieSlices={pieSlices}
            colors={CATEGORY_COLORS}
            onEditCategory={(category) => {
              setEditCategory(category);
              setEditCategoryName(category.name);
            }}
            onDeleteCategory={handleDeleteCategory}
            onAddCategory={handleOpenCategoryDialog}
            onTransfer={handleOpenTransfer}
            onAddMoney={handleOpenAddMoney}
            onWithdraw={handleOpenWithdraw}
          />
        )}
      </CardContent>

      {/* ---------------------------------------- Modals ---------------------------- */}
      {/* Édition */}
      <Modal
        title="Modifier le compte"
        open={editOpen}
        confirmLabel="Enregistrer"
        onClose={() => setEditOpen(false)}
        onConfirm={handleUpdate}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`name-${wallet.id}`}>Nom</Label>
            <Input id={`name-${wallet.id}`} value={editName} onChange={(e) => setEditName(e.target.value)} required />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor={`isLocked-${wallet.id}`}>Argent bloqué</Label>
            <Switch id={`isLocked-${wallet.id}`} checked={editIsLocked} onCheckedChange={setEditIsLocked} />
          </div>
        </div>
      </Modal>

      {/* Nouvelle poche */}
      <Modal
        title="Nouvelle poche"
        open={categoryDialogOpen}
        confirmLabel="Créer"
        onClose={() => setCategoryDialogOpen(false)}
        onConfirm={handleCreateCategory}
      >
        <div className="space-y-2">
          <Label htmlFor={`cat-name-${wallet.id}`}>Nom</Label>
          <Input
            id={`cat-name-${wallet.id}`}
            placeholder="Voiture"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
          />
        </div>
      </Modal>

      {/* Modifier une poche */}
      <Modal
        title="Modifier la poche"
        open={!!editCategory}
        confirmLabel="Enregistrer"
        onClose={() => setEditCategory(null)}
        onConfirm={handleUpdateCategory}
      >
        <div className="space-y-2">
          <Label htmlFor={`edit-cat-name-${editCategory?.id}`}>Nom</Label>
          <Input
            id={`edit-cat-name-${editCategory?.id}`}
            value={editCategoryName}
            onChange={(e) => setEditCategoryName(e.target.value)}
            required
          />
        </div>
      </Modal>

      <AddMoneyDialog
        open={addMoneyOpen}
        walletName={wallet.name}
        categories={wallet.categories}
        onClose={() => setAddMoneyOpen(false)}
        onConfirm={handleAddMoney}
      />

      <WithdrawDialog
        open={withdrawOpen}
        walletName={wallet.name}
        categories={wallet.categories}
        otherWallets={otherWallets}
        onClose={() => setWithdrawOpen(false)}
        onConfirm={handleWithdraw}
      />

      <TransferDialog
        open={transferOpen}
        walletName={wallet.name}
        categories={wallet.categories}
        onClose={() => setTransferOpen(false)}
        onConfirm={handleTransfer}
      />

      <WalletHistoryDialog
        open={historyOpen}
        walletName={wallet.name}
        loading={loadingHistory}
        transactions={transactions}
        onClose={() => setHistoryOpen(false)}
      />
    </Card>
  );
}
