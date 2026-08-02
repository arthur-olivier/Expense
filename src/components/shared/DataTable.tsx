// DataTable.tsx
// table générique typée : colonnes (header + render) + lignes, gère la colonne d'actions et l'état vide

"use client";

import { ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// une colonne. render reçoit la ligne et retourne le contenu de la cellule (badges, couleurs, formats)
export type Column<T> = {
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string; // sur le <th> ET le <td> pour garder l'alignement
  cellClassName?: string; // classes en plus sur le <td> seulement
  cellStyle?: (row: T) => React.CSSProperties; // couleurs par ligne (var(--color-success)...)
  // rôle en affichage mobile (< md) : "primary" = libellé principal, "amount" = montant à droite,
  // "meta" = badge sous le libellé, "hide" = masqué. Par défaut : "meta". Sans effet sur le tableau desktop.
  mobileRole?: "primary" | "amount" | "meta" | "hide";
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string | number; // key React de chaque ligne
  emptyMessage?: string;
  actions?: (row: T) => ReactNode; // colonne d'actions à droite
};

export default function DataTable<T>({ rows, columns, getRowId, emptyMessage = "Aucun élément", actions }: Props<T>) {
  // +1 si colonne d'actions, sinon le message vide ne prend pas toute la largeur
  const colSpan = columns.length + (actions ? 1 : 0);

  // Mobile : chaque ligne devient une carte-ligne (libellé + méta à gauche, montant à droite, actions)
  const primaryCol = columns.find((c) => c.mobileRole === "primary") ?? columns[0];
  const amountCol = columns.find((c) => c.mobileRole === "amount");
  const metaCols = columns.filter(
    (c) => c !== primaryCol && c !== amountCol && c.mobileRole !== "hide",
  );

  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: "var(--color-bg-card)", boxShadow: "var(--shadow-card)" }}>
      {/* Vue mobile : cartes-lignes empilées */}
      <div className="md:hidden">
        {rows.length === 0 ? (
          <p className="px-4 py-7 text-center text-sm" style={{ color: "var(--color-text-caption)" }}>
            {emptyMessage}
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={getRowId(row)}
              className="flex items-start gap-3 border-b px-4 py-3 last:border-0"
              style={{ borderColor: "var(--color-border-subtle)" }}
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium" style={primaryCol?.cellStyle?.(row)}>
                  {primaryCol?.render(row)}
                </div>
                {metaCols.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {metaCols.map((col, i) => (
                      <span key={i}>{col.render(row)}</span>
                    ))}
                  </div>
                )}
              </div>
              {(amountCol || actions) && (
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {amountCol && (
                    <div className="text-sm font-semibold" style={amountCol.cellStyle?.(row)}>
                      {amountCol.render(row)}
                    </div>
                  )}
                  {actions && <div>{actions(row)}</div>}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Vue desktop : tableau classique */}
      <div className="hidden md:block">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col, i) => (
              <TableHead key={i} className={col.className}>
                {col.header}
              </TableHead>
            ))}
            {actions && <TableHead />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={getRowId(row)}>
              {columns.map((col, i) => (
                <TableCell
                  key={i}
                  className={[col.className, col.cellClassName].filter(Boolean).join(" ")}
                  style={col.cellStyle?.(row)}
                >
                  {col.render(row)}
                </TableCell>
              ))}
              {actions && <TableCell className="text-right">{actions(row)}</TableCell>}
            </TableRow>
          ))}

          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-8 text-center text-sm" style={{ color: "var(--color-text-caption)" }}>
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
    </div>
  );
}
