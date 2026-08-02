// registre des courtiers pris en charge par l'import
// pour en ajouter un : créer son provider dans providers/ puis l'ajouter ici, rien d'autre à toucher (UI et actions génériques, voir BrokerImportProvider)
import type { BrokerImportProvider } from "./types";
import { tradeRepublicProvider } from "./providers/tradeRepublic";

export const BROKER_PROVIDERS: BrokerImportProvider[] = [tradeRepublicProvider];

export function getBrokerProvider(brokerId: string): BrokerImportProvider {
  const provider = BROKER_PROVIDERS.find((p) => p.id === brokerId);
  if (!provider) throw new Error("Banque non prise en charge.");
  return provider;
}

export function listBrokers(): { id: string; label: string }[] {
  return BROKER_PROVIDERS.map((p) => ({ id: p.id, label: p.label }));
}
