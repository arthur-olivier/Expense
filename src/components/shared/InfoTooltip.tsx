// InfoTooltip.tsx
// bouton "?" (icône info) qui affiche une infobulle au survol, contenu via content

"use client";

import { ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type Props = {
  content: ReactNode;
  size?: number;
  className?: string;
};

export default function InfoTooltip({ content, size = 14, className }: Props) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center rounded-full ${className ?? ""}`}
          style={{ color: "var(--color-text-muted)" }}
        >
          <Info size={size} />
        </button>
      </TooltipTrigger>
      <TooltipContent>{content}</TooltipContent>
    </Tooltip>
  );
}
