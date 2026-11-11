import * as XLSX from "xlsx";

export type ExportarExcelOptions = {
  sheetName?: string;
  fileName?: string;
  headers?: Record<string, string>;
};

/**
 * Exporta um array de dados para XLSX e dispara o download no navegador.
 * Exportacao 100% client-side (sem endpoint de API).
 *
 * @param data - linhas a exportar (cada objeto vira uma linha)
 * @param options - sheetName, fileName (sem extensao) e mapeamento opcional
 * de cabecalhos (chave do objeto -> rotulo em portugues)
 */
export function exportarExcel<T extends Record<string, unknown>>(
  data: T[],
  options: ExportarExcelOptions = {},
): void {
  const { sheetName = "Sheet1", fileName = "exportacao", headers } = options;

  const sheetData = headers
    ? data.map((row) => {
        const mapped: Record<string, unknown> = {};
        for (const key of Object.keys(row)) {
          mapped[headers[key] ?? key] = row[key];
        }
        return mapped;
      })
    : data;

  const worksheet = XLSX.utils.json_to_sheet(sheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const fileNameSafe = fileName.replace(/\.xlsx$/i, "");
  XLSX.writeFile(workbook, `${fileNameSafe}.xlsx`);
}
