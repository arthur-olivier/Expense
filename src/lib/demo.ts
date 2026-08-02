// Interrupteur global du mode démo, lu côté serveur ET client.
// En démo : aucune base, données en sessionStorage, auth bypassée.
export const isDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Utilisateur fictif renvoyé à la place d'une vraie session en mode démo.
export const DEMO_USER = {
  id: "demo-user",
  name: "Visiteur",
  email: "demo@expense.app",
  image: null,
};
