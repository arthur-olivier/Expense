import { redirect } from "next/navigation";

export default function Home() {
  // On ouvre directement sur le tableau de bord (en démo, l'auth est bypassée).
  redirect("/dashboard");
}
