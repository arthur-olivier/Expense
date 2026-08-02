"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Receipt,
  PiggyBank,
  TrendingUp,
  LineChart,
  LogOut,
  ChevronLeft,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/charges", label: "Charges", icon: Receipt },
  { href: "/wallet", label: "Comptes", icon: PiggyBank },
  { href: "/portfolio", label: "Bourse", icon: LineChart },
  { href: "/simulateur", label: "Simulateur", icon: TrendingUp },
];

const STORAGE_KEY = "sidebar-collapsed";

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setCollapsed(stored === "true");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      localStorage.setItem(STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  return (
    <aside
      className="shrink-0 hidden md:flex flex-col justify-between relative transition-all duration-200"
      style={{
        width: collapsed ? "64px" : "220px",
        background: "var(--color-bg-sidebar)",
        borderRight: "1px solid var(--color-sidebar-border)",
        paddingTop: "24px",
        paddingBottom: "20px",
        paddingLeft: collapsed ? "8px" : "16px",
        paddingRight: collapsed ? "8px" : "16px",
      }}
    >
      {/* Toggle button */}
      <button
        onClick={toggleCollapsed}
        className="absolute -right-3 top-6 flex items-center justify-center w-6 h-6 rounded-full cursor-pointer z-10 transition-colors duration-150"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--color-border-default)",
          color: "var(--color-text-muted)",
          boxShadow: "var(--shadow-card)",
        }}
        aria-label={collapsed ? "Afficher le menu" : "Cacher le menu"}
      >
        <ChevronLeft
          size={12}
          style={{
            transform: collapsed ? "rotate(180deg)" : "none",
            transition: "transform 0.2s",
          }}
        />
      </button>

      {/* Top: brand + nav */}
      <div>
        {/* Brand */}
        <div
          className={`flex items-center gap-2.5 mb-8 ${collapsed ? "justify-center" : "px-2"}`}
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="2" y="5" width="20" height="14" rx="2" stroke="white" strokeWidth="1.8" />
              <path d="M2 10h20" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M6 15h4" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-[15px] font-semibold text-white">Expense</span>
          )}
        </div>

        {/* Nav label */}
        {!collapsed && (
          <p
            className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.15em]"
            style={{ color: "var(--color-sidebar-icon)" }}
          >
            Navigation
          </p>
        )}

        {/* Navigation links */}
        <nav className="flex flex-col gap-0.5">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                title={collapsed ? link.label : undefined}
                className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 cursor-pointer group"
                style={{
                  color: isActive ? "white" : "var(--color-sidebar-text)",
                  fontWeight: isActive ? 500 : 400,
                  background: isActive ? "rgba(255,255,255,0.08)" : "transparent",
                  justifyContent: collapsed ? "center" : "flex-start",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.background = "rgba(255,255,255,0.06)";
                    (e.currentTarget as HTMLAnchorElement).style.color = "white";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
                    (e.currentTarget as HTMLAnchorElement).style.color = "var(--color-sidebar-text)";
                  }
                }}
              >
                {/* accent bleu collé au bord gauche (offset = padding de l'aside) */}
                {isActive && (
                  <span
                    className="absolute top-[7px] bottom-[7px] w-[3px] rounded-r"
                    style={{ left: collapsed ? "-8px" : "-16px", background: "#6E8BFF" }}
                  />
                )}
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{link.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom: user + logout */}
      {session?.user && (
        <div
          className="flex flex-col gap-0.5 pt-4"
          style={{ borderTop: "1px solid var(--color-sidebar-border)" }}
        >
          {/* User info */}
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
            style={{ justifyContent: collapsed ? "center" : "flex-start" }}
          >
            {session.user.image ? (
              <Image
                src={session.user.image}
                alt="avatar"
                width={26}
                height={26}
                className="rounded-full shrink-0"
                style={{ outline: "1px solid rgba(255,255,255,0.12)" }}
              />
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 shrink-0">
                <span className="text-[10px] font-semibold text-white">
                  {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
                </span>
              </div>
            )}
            {!collapsed && (
              <span
                className="text-xs font-medium truncate"
                style={{ color: "var(--color-sidebar-text)" }}
              >
                {session.user.name ?? session.user.email}
              </span>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title={collapsed ? "Se déconnecter" : undefined}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-left w-full cursor-pointer transition-all duration-150"
            style={{
              color: "var(--color-sidebar-text)",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239, 68, 68, 0.12)";
              (e.currentTarget as HTMLButtonElement).style.color = "#F87171";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--color-sidebar-text)";
            }}
          >
            <LogOut size={16} className="shrink-0" />
            {!collapsed && "Se déconnecter"}
          </button>
        </div>
      )}
    </aside>
  );
}
