import * as XLSX from "xlsx";

// une feuille du fichier Excel : nom, en-têtes, lignes de données
export type SheetConfig = {
  name: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
};

// génère et télécharge un .xlsx depuis une ou plusieurs feuilles
export function exportToExcel(filename: string, sheets: SheetConfig[]): void {
  const wb = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    XLSX.utils.book_append_sheet(wb, ws, sheet.name);
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}
