// GenericTabs.tsx
// onglets génériques : un tableau {label, icône, contenu}, le composant génère la barre et le contenu

"use client";

import { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// un onglet. content = le JSX affiché quand l'onglet est actif
export type TabItem<T extends string = string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
};

type Props<T extends string> = {
  tabs: TabItem<T>[];
  defaultValue?: T; // onglet actif au départ (défaut : le premier)
  value?: T; // seulement si le parent pilote l'onglet actif
  onValueChange?: (value: T) => void;
  className?: string; // sur le <Tabs>
  listClassName?: string; // sur la barre d'onglets (largeur)
  contentClassName?: string; // sur chaque <TabsContent>, ex pleine hauteur
};

export default function GenericTabs<T extends string>({
  tabs,
  defaultValue,
  value,
  onValueChange,
  className = "gap-0",
  listClassName = "mb-6 h-10 w-full max-w-sm p-1",
  contentClassName,
}: Props<T>) {
  return (
    <Tabs
      // sans value, Radix gère l'état lui-même (pas de useState côté parent)
      value={value}
      defaultValue={defaultValue ?? tabs[0]?.value}
      onValueChange={(v) => onValueChange?.(v as T)}
      className={className}
    >
      <TabsList className={listClassName} style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}>
        {tabs.map(({ value, label, icon: Icon }) => (
          <TabsTrigger key={value} value={value} className="min-w-0 flex-1 gap-1.5 text-xs md:gap-2 md:text-sm">
            {/* icône capitalisée pour l'utiliser comme composant JSX */}
            {Icon && <Icon size={14} className="shrink-0" />}
            <span className="truncate">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map(({ value, content }) => (
        <TabsContent key={value} value={value} className={contentClassName}>
          {content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
