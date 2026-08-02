"use client";

// MobileNavDrawer — avatar (bouton) + tiroir latéral de navigation (mobile uniquement).
// Reprend le contenu de la sidebar desktop : marque, liens, utilisateur, déconnexion.
// Aucune logique métier ajoutée : mêmes routes, même signOut que la sidebar.

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  TrendingUp,
  LineChart,
  LogOut,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/charges", label: "Charges", icon: Receipt },
  { href: "/wallet", label: "Comptes", icon: PiggyBank },
  { href: "/portfolio", label: "Bourse", icon: LineChart },
  { href: "/simulateur", label: "Simulateur", icon: TrendingUp },
];

export default function MobileNavDrawer() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const initial = (session?.user?.name ?? session?.user?.email ?? "?")[0]?.toUpperCase() ?? "?";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      {/* Déclencheur : avatar */}
      <DialogPrimitive.Trigger asChild>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full md:hidden"
          style={{ background: "#1E3A8A", color: "#fff" }}
          aria-label="Ouvrir le menu"
        >
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt="avatar"
              width={36}
              height={36}
              className="rounded-full"
            />
          ) : (
            <span className="text-[13px] font-bold">{initial}</span>
          )}
        </button>
      </DialogPrimitive.Trigger>

      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 md:hidden" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col px-3.5 pb-6 pt-12 text-white outline-none data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left md:hidden"
          style={{ background: "var(--color-bg-sidebar)" }}
        >
          <DialogPrimitive.Title className="sr-only">Navigation</DialogPrimitive.Title>

          {/* Marque */}
          <div className="mb-6 flex items-center gap-2.5 px-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="1.8" />
                <path d="M2 10h20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M6 15h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-[17px] font-bold">Expense</span>
          </div>

          <p
            className="mb-2.5 px-2 text-[10px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--color-sidebar-icon)" }}
          >
            Navigation
          </p>

          <nav className="flex flex-col gap-0.5">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-[14.5px] font-semibold"
                  style={{
                    color: isActive ? "#fff" : "var(--color-sidebar-text)",
                    background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
                  }}
                >
                  <Icon size={19} strokeWidth={1.9} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Bas : utilisateur + déconnexion */}
          {session?.user && (
            <div
              className="mt-auto pt-3.5"
              style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
            >
              <div className="flex items-center gap-3 p-2">
                {session.user.image ? (
                  <Image
                    src={session.user.image}
                    alt="avatar"
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ background: "#1D4ED8" }}
                  >
                    <span className="text-[13px] font-bold">{initial}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold">
                    {session.user.name ?? session.user.email}
                  </div>
                  <div className="text-[11px]" style={{ color: "var(--color-sidebar-icon)" }}>
                    Compte personnel
                  </div>
                </div>
              </div>

              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[14.5px] font-semibold"
                style={{ color: "#F87171" }}
              >
                <LogOut size={19} strokeWidth={1.9} />
                Se déconnecter
              </button>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
