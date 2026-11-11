// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { ExportarExcelButton } from "./exportar-excel-button";
import { exportarExcel } from "@/services/exportar-excel.service";

vi.mock("@/services/exportar-excel.service", () => ({
  exportarExcel: vi.fn(),
}));

const mockedExportarExcel = vi.mocked(exportarExcel);

const data = [
  { posto: "Posto A", combustivel: "Diesel", volume: 1000 },
  { posto: "Posto B", combustivel: "Gasolina", volume: 500 },
];

beforeEach(() => {
  mockedExportarExcel.mockClear();
});

afterEach(() => {
  cleanup();
});

function renderButton(
  perfil: "admin" | "padrao" | "restrito" | undefined,
) {
  cleanup(); // limpa o DOM acumulado entre renders no mesmo teste
  return render(
    <ExportarExcelButton
      data={data}
      fileName="relatorio-vendas"
      perfil={perfil}
      headers={{ posto: "Posto", combustivel: "Combustível" }}
    />,
  );
}

describe("ExportarExcelButton", () => {
  it("nao renderiza nada para o perfil restrito", () => {
    const { queryByRole, queryByText } = renderButton("restrito");

    expect(queryByRole("button")).toBeNull();
    expect(queryByText(/exportar excel/i)).toBeNull();
  });

  it("renderiza o botao com icone Download para perfis admin e padrao", () => {
    for (const perfil of ["admin", "padrao"] as const) {
      const { getByRole } = renderButton(perfil);

      const button = getByRole("button", {
        name: /exportar excel/i,
      });
      expect(button).not.toBeNull();
      expect(button.querySelector("svg")).not.toBeNull();
    }
  });

  it("dispara exportarExcel com os dados e opcoes ao clicar", () => {
    const { getByRole } = renderButton("admin");

    const button = getByRole("button", { name: /exportar excel/i });
    fireEvent.click(button);

    expect(mockedExportarExcel).toHaveBeenCalledTimes(1);
    expect(mockedExportarExcel).toHaveBeenCalledWith(data, {
      sheetName: "Exportacao",
      fileName: "relatorio-vendas",
      headers: { posto: "Posto", combustivel: "Combustível" },
    });
  });

  it("desabilita o botao quando nao ha dados", () => {
    const { getByRole } = render(
      <ExportarExcelButton data={[]} fileName="vazio" perfil="admin" />,
    );

    const button = getByRole("button", { name: /exportar excel/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("exibe feedback de sucesso apos clique com exportacao bem-sucedida", () => {
    const { getByRole, getByTestId } = renderButton("admin");

    const button = getByRole("button", { name: /exportar excel/i });
    fireEvent.click(button);

    expect(mockedExportarExcel).toHaveBeenCalledTimes(1);

    const feedback = getByTestId("export-feedback");
    expect(feedback.textContent).toContain("Exportacao concluida");
  });

  it("exibe feedback de erro quando exportarExcel lança excecao", () => {
    mockedExportarExcel.mockImplementation(() => {
      throw new Error("Falha de gravacao");
    });

    const { getByRole, getByTestId } = renderButton("admin");

    const button = getByRole("button", { name: /exportar excel/i });
    fireEvent.click(button);

    const feedback = getByTestId("export-feedback");
    expect(feedback.textContent).toContain("Erro ao exportar Excel");
  });
});
