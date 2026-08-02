// résultat d'une action : succès ou non + message pour l'utilisateur (affiché tel quel en toast)
export type ActionResult<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
};

// succès, avec message et éventuellement des données
export function ok<T = undefined>(message: string, data?: T): ActionResult<T> {
  return { success: true, message, data };
}

// échec attendu (cas métier : solde insuffisant, introuvable…), pas loggé car pas un bug
export function ko(message: string): ActionResult<never> {
  return { success: false, message };
}

// échec inattendu (bug/panne) : log du détail côté serveur + message simple à l'utilisateur
// context = nom de l'action pour retrouver la trace
export function fail(context: string, err: unknown, userMessage: string): ActionResult<never> {
  console.error(`[${context}]`, err);
  return { success: false, message: userMessage };
}

// erreur avec message destiné à l'utilisateur (ex: "Solde insuffisant"), affichable tel quel
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

// traduit une erreur en erreur affichable : UserError relancée telle quelle, sinon loggée et remplacée par un message générique
export function toUserError(context: string, err: unknown): never {
  if (err instanceof UserError) throw err;
  console.error(`[${context}]`, err);
  throw new UserError("Une erreur est survenue. Réessaie dans un instant.");
}

// exécute une action en faisant passer ses erreurs par toUserError (utilisé par les lectures)
export async function guardAction<T>(context: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    toUserError(context, err);
  }
}
