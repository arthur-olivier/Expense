// ActionMenu.tsx
// menu déroulant d'actions (les "..."), items label/icône/onClick + séparateurs et actions destructives

"use client";

import { ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Un item du menu
export type ActionItem = {
  label?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean; // item en rouge (supprimer, etc)
  separator?: boolean; // ligne de séparation en dessous
};

type Props = {
  items: ActionItem[];
  trigger?: ReactNode; // bouton d'ouverture custom, sinon les "..."
  label?: string; // titre optionnel en haut du menu
  align?: "start" | "center" | "end";
};

export default function ActionMenu({ items, trigger, label, align = "end" }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon" className="size-7 shrink-0">
            <MoreVertical className="size-4" />
          </Button>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align={align}>
        {label && <DropdownMenuLabel>{label}</DropdownMenuLabel>}

        {items.map((item, i) => {
          if (item.separator) return <DropdownMenuSeparator key={i} />;

          const Icon = item.icon;
          return (
            <DropdownMenuItem
              key={i}
              onClick={item.onClick}
              disabled={item.disabled}
              variant={item.destructive ? "destructive" : "default"}
            >
              {Icon && <Icon className="size-4" />}
              {item.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
