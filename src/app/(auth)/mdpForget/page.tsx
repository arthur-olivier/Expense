"use client";

import { useState } from "react";
import { sendResetEmail } from "@/actions/auth.actions";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    const result = await sendResetEmail(formData);
    if (result.error) {
      setError(result.error);
      return;
    }

    setSubmitted(true);
    setLoading(false);
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
            {!submitted ? (
              <>
                {/* Titre */}
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-gray-500">Mot de passe oublié</p>
                  <h1 className="text-[26px] font-bold leading-tight text-gray-900">
                    Réinitialiser
                  </h1>
                </div>

                <p className="text-sm text-gray-500 -mt-2">
                  Saisis ton adresse e-mail et on t'envoie un lien pour réinitialiser ton mot de
                  passe.
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

                  {error && <p className="text-sm text-red-500">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-200"
                  >
                    {loading ? "Envoi..." : "Envoyer le lien"}
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* État post-envoi */}
                <div className="flex flex-col gap-1">
                  <p className="text-sm text-gray-500">E-mail envoyé</p>
                  <h1 className="text-[26px] font-bold leading-tight text-gray-900">
                    Vérifie ta boîte mail
                  </h1>
                </div>

                <p className="text-sm text-gray-500 -mt-2">
                  Si un compte correspond à cet e-mail, tu recevras un lien de réinitialisation dans
                  quelques instants.
                </p>

                <Link
                  href="/login"
                  className="w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Retour à la connexion
                </Link>
              </>
            )}
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
