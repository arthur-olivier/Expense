import { Button } from "@/components/ui/button";

// affiché quand le chargement des données a échoué, le bouton relance via onRetry
export default function FetchError({
  message = "Impossible de charger les données.",
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 h-48 text-center">
      <p style={{ color: "var(--color-text-secondary)" }}>{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Réessayer
      </Button>
    </div>
  );
}
