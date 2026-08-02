"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";

interface AmountFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  suffix?: string;
  help?: string;
  prefillAmount?: number;
  prefillHint?: (amount: number) => string;
  onPrefill?: () => void;
  quickAddValues?: number[];
}

export function AmountField({
  label,
  value,
  onChange,
  suffix = "€",
  help,
  prefillAmount,
  prefillHint,
  onPrefill,
  quickAddValues,
}: AmountFieldProps) {
  const showPrefill = !!prefillAmount && prefillAmount > 0 && !!onPrefill;

  const handleQuickAdd = (increment: number) => {
    const current = parseFloat(value) || 0;
    onChange(String(current + increment));
  };

  return (
    <div className="space-y-1.5">
      <Label style={{ color: "var(--color-text-secondary)" }}>{label}</Label>
      <div className="relative flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            min={0}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            className="pr-10"
          />
          {suffix && (
            <span
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium"
              style={{ color: "var(--color-text-muted)" }}
            >
              {suffix}
            </span>
          )}
        </div>
        {showPrefill && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0 h-9 px-2 text-xs"
            onClick={onPrefill}
          >
            Pré-remplir
          </Button>
        )}
      </div>

      {quickAddValues && quickAddValues.length > 0 && (
        <div className="flex gap-1.5">
          {quickAddValues.map((increment) => (
            <Button
              key={increment}
              type="button"
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => handleQuickAdd(increment)}
            >
              {increment >= 0 ? `+${increment}` : increment}
            </Button>
          ))}
        </div>
      )}

      {showPrefill && prefillHint && (
        <p className="text-xs" style={{ color: "var(--color-text-caption)" }}>
          {prefillHint(prefillAmount!)}
        </p>
      )}
      {help && (
        <p
          className="flex items-center gap-1 text-xs"
          style={{ color: "var(--color-text-caption)" }}
        >
          <Info size={11} />
          {help}
        </p>
      )}
    </div>
  );
}

interface DurationSliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function DurationSlider({ value, onChange, min = 1, max = 40 }: DurationSliderProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label style={{ color: "var(--color-text-secondary)" }}>Durée</Label>
        <span className="text-sm font-semibold" style={{ color: "var(--color-investment)" }}>
          {value} an{value > 1 ? "s" : ""}
        </span>
      </div>
      <Slider min={min} max={max} step={1} value={[value]} onValueChange={([v]) => onChange(v)} />
      <div className="flex justify-between text-xs" style={{ color: "var(--color-text-caption)" }}>
        <span>{min} an</span>
        <span>{max} ans</span>
      </div>
    </div>
  );
}
