// vérifie un montant avant de toucher un solde : refuse non-nombre, négatif ou nul (sauf allowZero), et trop grand
// arrondit aux centimes pour éviter les erreurs de flottant
export function assertAmount(
  value: unknown,
  { allowZero = false, max = 1_000_000_000 }: { allowZero?: boolean; max?: number } = {},
): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) throw new Error("Montant invalide");
  if (n < 0 || (!allowZero && n === 0)) throw new Error("Le montant doit être strictement positif");
  if (n > max) throw new Error("Montant hors limites");
  return Math.round(n * 100) / 100;
}
