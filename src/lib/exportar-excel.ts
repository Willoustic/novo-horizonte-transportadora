import XLSX from "xlsx";

/**
 * MIME type oficial de documentos XLSX (Excel Open XML Spreadsheet).
 */
export const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface ExportarExcelOptions {
  /** Nome do arquivo baixado (incluindo extensao .xlsx). */
  filename?: string;
  /** Nome da aba (sheet) dentro da planilha gerada. */
  sheetName?: string;
}

const DEFAULT_FILENAME = "exportacao.xlsx";
const DEFAULT_SHEET_NAME = "Planilha1";

/**
 * Gera um blob XLSX a partir de um array de objetos e (quando executado no
 * navegador) dispara o download do arquivo.
 *
 * Retorna o blob gerado para permitir inspecao/testes sem depender do DOM.
 */
export function exportarExcel(
  data: Record<string, unknown>[],
  options: ExportarExcelOptions = {},
): Blob {
  const { filename = DEFAULT_FILENAME, sheetName = DEFAULT_SHEET_NAME } = options;

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  const buffer = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  }) as ArrayBuffer;

  const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE });

  // Dispara o download apenas em ambiente de navegador com DOM.
  // Em Node (ex.: vitest environment: node) eh um no-op e o blob e retornado.
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  return blob;
}
