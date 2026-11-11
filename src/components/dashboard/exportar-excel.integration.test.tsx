// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as XLSX from "xlsx";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { ExportarExcelButton } from "./exportar-excel-button";
import { exportarExcel } from "@/services/exportar-excel.service";

// Nao mockamos o servico: queremos testar o botao com o servico real.
// Apenas spyamos XLSX.writeFile para capturar o workbook gerado (sem gravar disco).
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

afterEach(() => {
  cleanup();
});

const data = [
  { posto: "Posto A", combustivel: "Diesel", volume: 1000 },
  { posto: "Posto B", combustivel: "Gasolina", volume: 500 },
];

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

describe("ExportarExcelButton + serviço real (integracao ponta-a-ponta)", () => {
  it("nao renderiza botao para perfil restrito", () => {
    const { queryByRole } = render(
      <ExportarExcelButton data={data} fileName="x" perfil="restrito" />,
    );
    expect(queryByRole("button")).toBeNull();
  });

  it("nao renderiza botao quando perfil e undefined", () => {
    const { queryByRole } = render(
      <ExportarExcelButton data={data} fileName="x" perfil={undefined} />,
    );
    expect(queryByRole("button")).toBeNull();
  });

  it("renderiza botao para perfis admin e padrao", () => {
    for (const perfil of ["admin", "padrao"] as const) {
      cleanup(); // limpa o DOM acumulado entre iterações
      const { queryAllByRole } = render(
        <ExportarExcelButton data={data} fileName="x" perfil={perfil} />,
      );
      const botoes = queryAllByRole("button", { name: /exportar excel/i });
      expect(botoes.length).toBeGreaterThan(0);
    }
  });

  it("chama o servico real e gera workbook com os dados do botao ao clicar", () => {
    const { getByRole, getByTestId } = render(
      <ExportarExcelButton
        data={data}
        fileName="litragem-pedidos"
        perfil="admin"
        headers={{
          posto: "Posto",
          combustivel: "Combustível",
          volume: "Volume",
        }}
      />,
    );

    const button = getByRole("button", { name: /exportar excel/i });
    fireEvent.click(button);

    // Servico real foi chamado (writeFile spy foi invocado pelo serviço real)
    expect(writeFileSpy).toHaveBeenCalledTimes(1);
    expect(writeFileSpy.mock.calls[0][1]).toBe("litragem-pedidos.xlsx");

    const workbook = capturedWorkbook();
    expect(workbook.SheetNames).toContain("Exportacao");
    const rows = sheetRows(workbook, "Exportacao");
    expect(rows).toEqual([
      { Posto: "Posto A", "Combustível": "Diesel", Volume: 1000 },
      { Posto: "Posto B", "Combustível": "Gasolina", Volume: 500 },
    ]);

    // Feedback de sucesso aparece apos o clique
    const feedback = getByTestId("export-feedback");
    expect(feedback.textContent).toContain("Exportacao concluida");
  });

  it("desabilita o botao quando nao ha dados", () => {
    const { getByRole } = render(
      <ExportarExcelButton data={[]} fileName="vazio" perfil="admin" />,
    );
    const button = getByRole("button", { name: /exportar excel/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("exibe feedback de erro quando o servico real lança excecao", () => {
    writeFileSpy.mockImplementation(() => {
      throw new Error("Falha de gravacao");
    });

    const { getByRole, getByTestId } = render(
      <ExportarExcelButton data={data} fileName="erro" perfil="admin" />,
    );

    const button = getByRole("button", { name: /exportar excel/i });
    fireEvent.click(button);

    const feedback = getByTestId("export-feedback");
    expect(feedback.textContent).toContain("Erro ao exportar Excel");
  });
});
