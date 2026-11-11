"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportarExcel } from "@/lib/exportar-excel.service";

export type Perfil = "admin" | "padrao" | "restrito";

interface ExportarExcelButtonProps {
  data: any[];
  fileName: string;
  sheetName?: string;
  headers?: Record<string, string>;
  perfil?: Perfil;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * Botao "Exportar Excel" (shadcn/ui Button + icone Download).
 * - Verde #16a34a (variant default) com hover amarelo #eab308.
 * - Perfil restrito nao exibe o botao (retorna null).
 * - Exportacao client-side via xlsx, sem endpoint de API.
 */
export function ExportarExcelButton({
  data,
  fileName,
  sheetName = "Exportacao",
  headers,
  perfil,
  disabled = false,
  className,
  label = "Exportar Excel",
}: ExportarExcelButtonProps): JSX.Element | null {
  // Restrito nao tem operacao: nao exibe o botao.
  if (perfil === "restrito") {
    return null;
  }

  const handleExport = () => {
    exportarExcel(data, { sheetName, fileName, headers });
  };

  const isEmpty = data.length === 0;

  return (
    <Button
      onClick={handleExport}
      disabled={disabled || isEmpty}
      variant="default"
      size="sm"
      className={cn(
        "bg-green-600 text-white hover:bg-yellow-500 hover:text-gray-900",
        className,
      )}
    >
      <Download className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}
