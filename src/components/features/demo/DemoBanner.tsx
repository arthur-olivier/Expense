"use client";

// Bandeau permanent affiché en mode démo : rappelle que les données sont fictives et
// non sauvegardées, et propose de réinitialiser le bac à sable.

import { RotateCcw, FlaskConical } from "lucide-react";
import { resetDemo } from "@/lib/demo/store";

export default function DemoBanner() {
  function handleReset() {
    resetDemo();
    window.location.reload();
  }

  return (
    <div
      className="flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium text-white"
      style={{ background: "linear-gradient(90deg, #6366f1, #a855f7)" }}
    >
      <FlaskConical className="size-4 shrink-0" />
      <span className="text-center">
        Version démo — données fictives, modifiables librement mais <strong>non sauvegardées</strong> (elles vivent le temps de la session).
      </span>
      <button
        onClick={handleReset}
        className="ml-2 inline-flex items-center gap-1.5 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold transition hover:bg-white/25"
      >
        <RotateCcw className="size-3.5" />
        Réinitialiser
      </button>
    </div>
  );
}
