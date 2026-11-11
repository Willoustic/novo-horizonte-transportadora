import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";
import {
  exportarExcel,
  type ExportarExcelOptions,
} from "./exportar-excel.service";

vi.mock("xlsx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("xlsx")>();
  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

const writeFileSpy = vi.mocked(XLSX.writeFile);

beforeEach(() => {
  writeFileSpy.mockReset();
});

function capturedWorkbook(): XLSX.WorkBook {
  expect(writeFileSpy).toHaveBeenCalledTimes(1);
  return writeFileSpy.mock.calls[0][0] as XLSX.WorkBook;
}

function sheetRows(
  workbook: XLSX.WorkBook,
  sheetName: string,
): Array<Record<string, unknown>> {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found in workbook`);
  }
  return XLSX.utils.sheet_to_json(sheet);
}

describe("exportarExcel (service)", () => {
  const data = [
    { posto: "Posto A", combustivel: "Diesel", volume: 1000 },
    { posto: "Posto B", combustivel: "Gasolina", volume: 500 },
  ];

  it("gera o workbook com os dados corretos (round-trip)", () => {
    exportarExcel(data, { sheetName: "Litragem", fileName: "litragem" });

    const workbook = capturedWorkbook();
    expect(writeFileSpy.mock.calls[0][1]).toBe("litragem.xlsx");
    const rows = sheetRows(workbook, "Litragem");
    expect(rows).toEqual([
      { posto: "Posto A", combustivel: "Diesel", volume: 1000 },
      { posto: "Posto B", combustivel: "Gasolina", volume: 500 },
    ]);
  });

  it("usa sheetName customizado quando informado", () => {
    exportarExcel([{ posto: "Posto A" }], { sheetName: "MinhaAba" });

    const workbook = capturedWorkbook();
    expect(workbook.SheetNames).toContain("MinhaAba");
  });

  it("usa sheetName padrao Sheet1 quando nao informado", () => {
    exportarExcel([{ posto: "Posto A" }]);

    const workbook = capturedWorkbook();
    expect(workbook.SheetNames).toContain("Sheet1");
  });

  it("adiciona extensao .xlsx quando o nome nao a tem", () => {
    exportarExcel([{ posto: "Posto A" }], { fileName: "relatorio-vendas" });

    expect(writeFileSpy.mock.calls[0][1]).toBe("relatorio-vendas.xlsx");
  });

  it("mantem o nome quando ja tem extensao .xlsx", () => {
    exportarExcel([{ posto: "Posto A" }], { fileName: "outro.xlsx" });

    expect(writeFileSpy.mock.calls[0][1]).toBe("outro.xlsx");
  });

  it("substitui extensao .xlsx independente de maiusculas e minusculas", () => {
    exportarExcel([{ posto: "Posto A" }], { fileName: "relatorio.XLSX" });

    expect(writeFileSpy.mock.calls[0][1]).toBe("relatorio.xlsx");
  });

  it("usa headers mapeados para rotular as colunas", () => {
    const headers: ExportarExcelOptions["headers"] = {
      posto: "Posto",
      combustivel: "Combustível",
      volume: "Volume (L)",
    };

    exportarExcel(data, { headers });

    const workbook = capturedWorkbook();
    const rows = sheetRows(workbook, "Sheet1");
    expect(rows).toEqual([
      { Posto: "Posto A", Combustível: "Diesel", "Volume (L)": 1000 },
      { Posto: "Posto B", Combustível: "Gasolina", "Volume (L)": 500 },
    ]);
  });

  it("nao quebra com dados vazios", () => {
    writeFileSpy.mockReset();
    expect(() => exportarExcel([], {})).not.toThrow();

    const workbook = capturedWorkbook();
    expect(workbook.SheetNames).toContain("Sheet1");
    expect(sheetRows(workbook, "Sheet1")).toEqual([]);
  });

  it("propaga erros lancados por XLSX.writeFile", () => {
    writeFileSpy.mockImplementation(() => {
      throw new Error("Falha de gravacao");
    });

    expect(() => exportarExcel([{ posto: "Posto A" }])).toThrow(
      "Falha de gravacao",
    );
  });
});
