"use client";

// MobileTabBar — barre d'onglets bas d'écran (mobile uniquement, < md).
// Reprend les 5 entrées de la sidebar sur le même navy. Aucune logique métier.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, PiggyBank, TrendingUp, LineChart } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/charges", label: "Flux mensuels", icon: Receipt },
  { href: "/wallet", label: "Comptes", icon: PiggyBank },
  { href: "/portfolio", label: "Bourse", icon: LineChart },
  { href: "/simulateur", label: "Simulateur", icon: TrendingUp },
];

export default function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex items-start px-2 pt-2 md:hidden"
      style={{
        height: "calc(72px + env(safe-area-inset-bottom))",
        paddingBottom: "env(safe-area-inset-bottom)",
        background: "rgba(15,23,42,0.97)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {links.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5"
            style={{
              color: isActive ? "#ffffff" : "#94a3b8",
              background: isActive ? "rgba(255,255,255,0.10)" : "transparent",
            }}
          >
            <Icon size={20} strokeWidth={1.9} />
            <span className="text-[9.5px] font-semibold tracking-tight">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
