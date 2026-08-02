"use client";

import { useState } from "react";
import { registerUser } from "@/actions/auth.actions";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    try {
      const result = await registerUser(formData);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Compte créé avec succès");

      await signIn("credentials", {
        email: formData.get("email"),
        password,
        callbackUrl: "/dashboard",
      });
    } catch {
      toast.error("Erreur lors de la création du compte");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <div className="relative flex w-full flex-col bg-white px-10 py-8 lg:w-1/2">
        {/* Logo top-left */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="1.8" />
              <path d="M2 10h20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M6 15h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-[15px] font-semibold text-gray-900">Expense</span>
        </div>

        {/* Centered form */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex w-full max-w-[360px] flex-col gap-6">
            {/* Titre */}
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-500">Bienvenue</p>
              <h1 className="text-[26px] font-bold leading-tight text-gray-900">Créer un compte</h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] font-medium text-gray-500">
                  Nom
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Exemple"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] font-medium text-gray-500">
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="exemple@email.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] font-medium text-gray-500">
                  Mot de passe
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <Eye /> : <EyeOff />}
                </button>
              </div>

              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] font-medium text-gray-500">
                  Confirmer le mot de passe
                </label>
                <input
                  type={showConfirm ? "text" : "password"}
                  name="confirmPassword"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 text-sm outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <Eye /> : <EyeOff />}
                </button>
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-200"
              >
                {loading ? "Création..." : "Créer mon compte"}
              </button>
            </form>
          </div>
          {/* Bottom link */}
          <p className="text-sm text-gray-500">
            Déjà un compte ?{" "}
            <Link href="/login" className="font-semibold text-blue-600 hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>

      {/* ── Right panel – fluid gradient ── */}
      <div
        className="hidden lg:block lg:w-1/2"
        style={{
          background: `
            radial-gradient(ellipse at 20% 50%, #a78bfa 0%, transparent 60%),
            radial-gradient(ellipse at 80% 20%, #60a5fa 0%, transparent 55%),
            radial-gradient(ellipse at 60% 80%, #f472b6 0%, transparent 50%),
            radial-gradient(ellipse at 40% 30%, #818cf8 0%, transparent 45%),
            radial-gradient(ellipse at 70% 60%, #38bdf8 0%, transparent 40%),
            linear-gradient(135deg, #6366f1 0%, #a78bfa 40%, #f0abfc 70%, #bfdbfe 100%)
          `,
        }}
      />
    </div>
  );
}
