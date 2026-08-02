import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// formatage monétaire fr-FR, centralisé pour ne pas redéfinir l'option Intl partout
export function formatCurrency(value: number, currency: string) {
  return value.toLocaleString("fr-FR", { style: "currency", currency })
}

// raccourci pour le cas courant (euros)
export function formatEUR(value: number) {
  return formatCurrency(value, "EUR")
}
