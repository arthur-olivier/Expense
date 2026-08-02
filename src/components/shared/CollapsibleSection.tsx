// CollapsibleSection.tsx
// section repliable, bouton +/-, header toujours visible et children masqués quand replié

"use client";

import { ReactNode } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  header: ReactNode;
  children: ReactNode;
};

export default function CollapsibleSection({ open, onOpenChange, header, children }: Props) {
  return (
    <Collapsible open={open} onOpenChange={onOpenChange}>
      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="icon" className="size-9">
              {open ? <Minus className="size-3.5" /> : <Plus className="size-3.5" />}
            </Button>
          </CollapsibleTrigger>
          <div className="flex flex-1 items-center justify-between">{header}</div>
        </div>
        <CollapsibleContent>{children}</CollapsibleContent>
      </section>
    </Collapsible>
  );
}
