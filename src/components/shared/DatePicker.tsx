// DatePicker.tsx
// sélecteur de date (calendrier en popover) sur des objets Date, bornes min/max et option "Jamais"

"use client";

import * as React from "react";
import { format, startOfDay } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  value?: Date;
  onChange: (date?: Date) => void;
  allowNever?: boolean;
  minDate?: Date;
  maxDate?: Date;
};

export function DatePicker({ value, onChange, allowNever, minDate, maxDate }: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-8 w-full justify-start px-3 text-sm">
          {value ? format(value, "dd/MM/yyyy") : allowNever ? "Jamais" : "Choisir une date"}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          disabled={(day) => {
            if (minDate && startOfDay(day) < startOfDay(minDate)) return true;
            if (maxDate && startOfDay(day) > startOfDay(maxDate)) return true;
            return false;
          }}
          onSelect={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
        {allowNever && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              Jamais
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
