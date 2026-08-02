"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { resetPassword } from "@/actions/auth.actions";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";

const GradientPanel = () => (
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
);

const Logo = () => (
  <div className="flex items-center gap-2.5">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="1.8" />
        <path d="M2 10h20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 15h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
    <span className="text-[15px] font-semibold text-gray-900">Expense</span>
  </div>
);

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

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
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!token) {
      setError("Lien invalide.");
      return;
    }

    setLoading(true);
    formData.append("token", token);

    const result = await resetPassword(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/login");
  }

  if (!token) {
    return (
      <div className="flex min-h-screen">
        <div className="relative flex w-full flex-col bg-white px-10 py-8 lg:w-1/2">
          <Logo />
          <div className="flex flex-1 flex-col items-center justify-center gap-6">
            <div className="flex w-full max-w-[360px] flex-col gap-6">
              <div className="flex flex-col gap-1">
                <p className="text-sm text-gray-500">Lien invalide</p>
                <h1 className="text-[26px] font-bold leading-tight text-gray-900">
                  Ce lien est invalide
                </h1>
              </div>
              <p className="text-sm text-gray-500 -mt-2">
                Le lien est manquant ou malformé. Refais une demande de réinitialisation.
              </p>
              <Link
                href="/mdpForget"
                className="w-full rounded-xl bg-blue-600 py-3 text-center text-sm font-semibold text-white hover:bg-blue-700"
              >
                Refaire une demande
              </Link>
            </div>
          </div>
        </div>
        <GradientPanel />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="relative flex w-full flex-col bg-white px-10 py-8 lg:w-1/2">
        <Logo />
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex w-full max-w-[360px] flex-col gap-6">
            <div className="flex flex-col gap-1">
              <p className="text-sm text-gray-500">Nouveau mot de passe</p>
              <h1 className="text-[26px] font-bold leading-tight text-gray-900">
                Choisir un mot de passe
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="relative">
                <label className="absolute -top-2 left-3 bg-white px-1 text-[11px] font-medium text-gray-500">
                  Nouveau mot de passe
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
                {loading ? "Enregistrement..." : "Enregistrer le mot de passe"}
              </button>
            </form>
          </div>
        </div>
      </div>
      <GradientPanel />
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
