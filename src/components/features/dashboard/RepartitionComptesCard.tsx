import { Landmark, Lock } from "lucide-react";
import { formatEUR } from "@/lib/utils";
import type { DashboardData } from "./types";

type Props = {
  accountSlices: DashboardData["accountSlices"];
  totalPatrimoine: number;
};

// comptes du patrimoine avec total en pied, cadenas = compte bloqué
export function RepartitionComptesCard({ accountSlices, totalPatrimoine }: Props) {
  return (
    <div className="rounded-2xl p-5 md:p-6" style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Par compte
        </p>
        <span className="text-xs" style={{ color: "var(--color-text-caption)" }}>
          {accountSlices.length}
        </span>
      </div>

      {accountSlices.length > 0 ? (
        <div className="flex flex-col gap-3">
          {accountSlices.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-2 text-[13px]">
              <span className="flex min-w-0 items-center gap-2" style={{ color: "var(--color-text-primary)" }}>
                {a.isLocked ? (
                  <Lock size={15} className="shrink-0" style={{ color: "var(--color-text-caption)" }} />
                ) : (
                  <Landmark size={15} className="shrink-0" style={{ color: "var(--color-text-caption)" }} />
                )}
                <span className="truncate">{a.label}</span>
              </span>
              <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{formatEUR(a.value)}</span>
            </div>
          ))}

          <div
            className="flex justify-between border-t pt-2.5 text-[13px]"
            style={{ borderColor: "var(--color-border-subtle)", color: "var(--color-text-secondary)" }}
          >
            <span>Total</span>
            <span className="font-medium" style={{ color: "var(--color-text-primary)" }}>{formatEUR(totalPatrimoine)}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: "var(--color-text-caption)" }}>
          Aucun compte pour le moment
        </p>
      )}
    </div>
  );
}
