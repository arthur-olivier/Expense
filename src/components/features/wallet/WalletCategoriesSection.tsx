"use client";

import { FolderPlus, ArrowLeftRight, PlusCircle, MinusCircle, Pencil } from "lucide-react";
import ConfirmDeleteDialog from "@/components/shared/ConfirmDeleteDialog";
import PieChart from "@/components/shared/PieChart";
import { Button } from "@/components/ui/button";
import { formatEUR } from "@/lib/utils";
import type { WalletCategory } from "@/types/wallet";

type Slice = { label: string; value: number; color: string };

type Props = {
  categories: WalletCategory[];
  pieSlices: Slice[];
  colors: string[];
  onEditCategory: (category: WalletCategory) => void;
  onDeleteCategory: (id: string) => void;
  onAddCategory: () => void;
  onTransfer: () => void;
  onAddMoney: () => void;
  onWithdraw: () => void;
};

export default function WalletCategoriesSection({
  categories,
  pieSlices,
  colors,
  onEditCategory,
  onDeleteCategory,
  onAddCategory,
  onTransfer,
  onAddMoney,
  onWithdraw,
}: Props) {
  return (
    <div className="mt-4 space-y-4">
      {categories.length === 0 ? (
        <p className="py-4 text-center text-xs" style={{ color: "var(--color-text-caption)" }}>
          Aucune poche. L'argent n'est pas encore réparti.
        </p>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {pieSlices.length > 0 && (
            <div className="shrink-0">
              <PieChart showAmount={false} legendPosition="left" slices={pieSlices} />
            </div>
          )}
          <div className="flex flex-1 flex-col gap-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between rounded-lg px-3 py-2"
                style={{ background: "var(--color-bg-surface)" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="size-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        category.balance > 0
                          ? colors[
                              pieSlices.findIndex((s) => s.label === category.name) % colors.length
                            ]
                          : "var(--color-border-default)",
                    }}
                  />
                  <div>
                    <p
                      className="text-sm font-medium"
                      style={{ color: "var(--color-text-primary)" }}
                    >
                      {category.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                      {formatEUR(category.balance)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    onClick={() => onEditCategory(category)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  {category.balance === 0 && (
                    <ConfirmDeleteDialog
                      title={`Supprimer ${category.name} ?`}
                      description="Cette poche est vide et peut être supprimée."
                      onConfirm={() => onDeleteCategory(category.id)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions — 2×2 sur mobile, en ligne dès md */}
      <div className="grid grid-cols-2 gap-2 pt-1 md:flex">
        <Button variant="outline" className="md:flex-1" onClick={onAddCategory}>
          <FolderPlus className="size-4" /> Poche
        </Button>
        <Button
          variant="outline"
          className="md:flex-1"
          onClick={onTransfer}
          disabled={categories.length < 2}
        >
          <ArrowLeftRight className="size-4" /> Transférer
        </Button>
        <Button
          variant="outline"
          className="md:flex-1"
          onClick={onAddMoney}
          disabled={categories.length === 0}
        >
          <PlusCircle className="size-4" /> Ajouter
        </Button>
        <Button
          variant="outline"
          className="md:flex-1"
          onClick={onWithdraw}
          disabled={categories.length === 0}
        >
          <MinusCircle className="size-4" /> Retirer
        </Button>
      </div>
    </div>
  );
}
