"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (res?.error) {
        if (res.error === "DatabaseError") {
          toast.error("Erreur de connexion, réessaie plus tard");
        } else {
          toast.error("Email ou mot de passe incorrect");
        }
        return;
      }
      toast.success("Connexion réussie");
      router.push("/dashboard");
    } catch {
      toast.error("Erreur lors de la connexion");
    } finally {
      setLoading(false);
    }

    toast.success("Connexion réussie");
    router.push("/dashboard");
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
              <h1 className="text-[26px] font-bold leading-tight text-gray-900">
                Connectez-vous à Expense
              </h1>
            </div>

            {/* Google button */}
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" }, { prompt: "select_account" })}
              className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:bg-gray-50 hover:shadow-md"
            >
              <GoogleIcon />
              Se connecter avec Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-gray-400">ou continuer avec</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

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

              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] font-medium text-gray-500">
                  Mot de passe
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-blue-200"
              >
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          </div>
          {/* Bottom link */}
          <p className="text-sm text-gray-500">
            Pas de compte ?{" "}
            <Link href="/register" className="font-semibold text-blue-600 hover:underline">
              S'inscrire
            </Link>
          </p>

          {/* Lien mot de passe oublié */}
          <div className="flex justify-end -mt-2">
            <Link href="/mdpForget" className="text-xs text-blue-600 hover:underline">
              Mot de passe oublié ?
            </Link>
          </div>
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.233 17.64 11.925 17.64 9.2z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
