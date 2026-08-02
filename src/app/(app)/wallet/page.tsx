"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, Lock, Unlock } from "lucide-react";

import { getWallets, createWallet, deleteWallet } from "@/actions/wallet.actions";
import { useFetch } from "@/hooks/useFetch";
import Spinner from "@/components/shared/Spinner";
import FetchError from "@/components/shared/FetchError";
import WalletCard from "@/components/features/wallet/WalletCard";
import type { Wallet } from "@/types/wallet";
import { formatEUR } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Modal from "@/components/shared/Modal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import WalletExportDialog from "@/components/features/wallet/dialog/WalletExportDialog";
import PageGuide from "@/components/shared/PageGuide";
import MobileNavDrawer from "@/components/shared/MobileNavDrawer";

export default function WalletPage() {
  const { data: wallets, setData: setWallets, isLoading, error, refetch: refetchWallets } = useFetch(() => getWallets(), []);

  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [isLocked, setIsLocked] = useState(false);
  const totalBalance = wallets?.reduce((sum, w) => sum + w.balance, 0) ?? 0;
  const lockedBalance = wallets?.filter((w) => w.isLocked).reduce((sum, w) => sum + w.balance, 0) ?? 0;
  const availableBalance = totalBalance - lockedBalance;

  //reset de la modal de création
  function resetCreateForm() {
    setName("");
    setInitialBalance("0");
    setIsLocked(false);
  }

  //ferme la modal de création
  function handleCloseCreate() {
    setCreateOpen(false);
    resetCreateForm();
  }

  //ajoute un compte
  async function handleCreate() {
    startTransition(async () => {
      try {
        const res = await createWallet({
          name,
          isLocked,
          initialBalance: Number(initialBalance || 0),
        });
        if (!res.success || !res.data) {
          toast.error(res.message);
          return;
        }
        const created = res.data;
        setWallets((prev) => [...(prev ?? []), { ...created, categories: [] }]);
        toast.success(res.message);
        handleCloseCreate();
      } catch {
        toast.error("Impossible de créer le compte.");
      }
    });
  }

  //maj d'un compte
  function handleWalletChange(updated: Wallet) {
    setWallets((prev) => (prev?.map((w) => (w.id === updated.id ? updated : w)) as typeof prev) ?? []);
  }

  //supprime un compte
  async function handleWalletDelete(id: string) {
    try {
      const res = await deleteWallet(id);
      if (!res.success) {
        toast.error(res.message);
        return;
      }
      setWallets((prev) => prev?.filter((w) => w.id !== id) ?? []);
      toast.success(res.message);
    } catch {
      toast.error("Impossible de supprimer le compte.");
    }
  }

  if (error) return <FetchError message="Impossible de charger tes comptes." onRetry={refetchWallets} />;
  if (isLoading) return <Spinner />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text-primary)" }}>
                Comptes d'épargne
              </h1>
              <PageGuide pageKey="wallet" autoOpen={(wallets?.length ?? 0) === 0} />
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Soldes, poches et mouvements de vos comptes
            </p>
          </div>
          {/* avatar toujours en haut à droite sur mobile */}
          <div className="md:hidden">
            <MobileNavDrawer />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" />
            Nouveau compte
          </Button>
          <WalletExportDialog wallets={wallets ?? []} />
        </div>
      </div>

      {/* total épargne */}
      <div
        className="rounded-2xl px-5 py-5 overflow-hidden md:px-7 md:py-6"
        style={{
          background: "var(--color-bg-card)",
          boxShadow: "var(--shadow-card-lg)",
          borderTop: "3px solid var(--color-investment)",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: "var(--color-text-muted)" }}>
          Total épargne
        </p>
        <p className="text-4xl font-bold" style={{ color: "var(--color-text-primary)" }}>
          {formatEUR(totalBalance)}
        </p>
        <div className="mt-4 flex items-center gap-5">
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "var(--color-success-bg)" }}
            >
              <Unlock className="size-3.5" style={{ color: "var(--color-success)" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Disponible
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--color-success)" }}>
                {formatEUR(availableBalance)}
              </p>
            </div>
          </div>
          <div className="h-8 w-px" style={{ background: "var(--color-border-default)" }} />
          <div className="flex items-center gap-2">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-md"
              style={{ background: "var(--color-warning-bg)" }}
            >
              <Lock className="size-3.5" style={{ color: "var(--color-warning)" }} />
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                Bloqué
              </p>
              <p className="text-sm font-semibold" style={{ color: "var(--color-warning)" }}>
                {formatEUR(lockedBalance)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* liste des comptes */}
      {wallets?.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm" style={{ color: "var(--color-text-caption)" }}>
            Aucun compte pour l'instant. Crée ton premier livret ou compte courant.
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {wallets?.map((wallet) => (
            <WalletCard
              key={wallet.id}
              wallet={wallet}
              onChange={handleWalletChange}
              onDelete={handleWalletDelete}
              onRefreshAll={refetchWallets}
            />
          ))}
        </div>
      )}

      {/* modal création compte */}
      <Modal
        title="Nouveau compte"
        open={createOpen}
        confirmLabel={isPending ? "Création..." : "Créer"}
        onClose={handleCloseCreate}
        onConfirm={handleCreate}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" placeholder="Livret A" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initialBalance">Solde initial</Label>
            <Input
              id="initialBalance"
              type="number"
              step="0.01"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="isLocked">Argent bloqué</Label>
            <Switch id="isLocked" checked={isLocked} onCheckedChange={setIsLocked} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
