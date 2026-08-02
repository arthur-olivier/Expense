// GenericSelect.tsx
// select générique typé : items + accesseurs getValue/getLabel, sans coupler le composant au type des données

"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type GenericSelectProps<T> = {
  items: T[];
  getValue: (item: T) => string;
  getLabel: (item: T) => string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  // mode contrôlé
  value?: string;
  onValueChange?: (value: string) => void;
  // mode non contrôlé (formulaires natifs avec FormData)
  name?: string;
  defaultValue?: string;
  required?: boolean;
};

export default function GenericSelect<T>({
  items,
  getValue,
  getLabel,
  placeholder = "Choisir une option",
  disabled,
  className,
  value,
  onValueChange,
  name,
  defaultValue,
  required,
}: GenericSelectProps<T>) {
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      name={name}
      required={required}
      disabled={disabled}
    >
      <SelectTrigger className={className ?? "w-full"}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={getValue(item)} value={getValue(item)}>
            {getLabel(item)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
