// Spinner.tsx
// loader : cercle qui tourne centré dans une zone de hauteur fixe, pendant l'attente des données

export default function Spinner() {
  return (
    <div className="flex items-center justify-center h-48">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent"
        style={{ color: "var(--color-accent)" }}
      />
    </div>
  );
}
