// MonthYearPicker.tsx
// sélecteur mois/année : flèches préc/suiv + popover (selects mois + année, bouton "Aujourd'hui"), notifie via onChange

"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import GenericSelect from "@/components/shared/GenericSelect";
import { MONTH_NAMES } from "@/lib/enums";

type Props = {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
};

export default function MonthYearPicker({ year, month, onChange }: Props) {
  const [open, setOpen] = useState(false);

  function goToPreviousMonth() {
    if (month === 0) {
      onChange(year - 1, 11);
    } else {
      onChange(year, month - 1);
    }
  }

  function goToNextMonth() {
    if (month === 11) {
      onChange(year + 1, 0);
    } else {
      onChange(year, month + 1);
    }
  }

  const years = Array.from({ length: 10 }, (_, i) => year - 5 + i);

  return (
    <div className="flex items-center justify-center gap-4">
      <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild className="cursor-pointer">
          <button
            className="w-36 rounded-lg py-1.5 text-center text-sm font-semibold transition-colors duration-150 hover:bg-slate-100"
            style={{ color: "var(--color-text-primary)" }}
          >
            {MONTH_NAMES[month]} {year}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <GenericSelect
                items={MONTH_NAMES.map((name, index) => ({ name, index }))}
                value={String(month)}
                onValueChange={(v) => onChange(year, Number(v))}
                getValue={(m) => String(m.index)}
                getLabel={(m) => m.name}
                className="flex-1"
              />

              <GenericSelect
                items={years}
                value={String(year)}
                onValueChange={(v) => onChange(Number(v), month)}
                getValue={(y) => String(y)}
                getLabel={(y) => String(y)}
                className="w-24"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const now = new Date();
                onChange(now.getFullYear(), now.getMonth());
                setOpen(false);
              }}
            >
              Aujourd'hui
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <Button variant="outline" size="icon" onClick={goToNextMonth}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
