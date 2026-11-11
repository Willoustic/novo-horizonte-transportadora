"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportarExcel } from "@/services/exportar-excel.service";

export type Perfil = "admin" | "padrao" | "restrito";

interface ExportarExcelButtonProps {
  data: Record<string, unknown>[];
  fileName: string;
  sheetName?: string;
  headers?: Record<string, string>;
  perfil?: Perfil;
  disabled?: boolean;
  className?: string;
  label?: string;
}

/**
 * "Export Excel" button (shadcn/ui Button + Download icon).
 * - Green #16a34a (default variant) with yellow #eab308 hover.
 * - Restricted profile does not display the button (returns null).
 * - Client-side export via xlsx, no API endpoint.
 * - Displays success or error feedback after click.
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
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Restricted profile has no operation: do not display the button.
  if (perfil !== "admin" && perfil !== "padrao") {
    return null;
  }

  const handleExport = () => {
    try {
      exportarExcel(data, { sheetName, fileName, headers });
      setFeedback({
        type: "success",
        message: "Exportacao concluida com sucesso!",
      });
    } catch {
      setFeedback({
        type: "error",
        message: "Erro ao exportar Excel. Tente novamente.",
      });
    }
  };

  const isEmpty = data.length === 0;

  return (
    <>
      <Button
        onClick={handleExport}
        disabled={disabled || isEmpty}
        variant="default"
        size="sm"
        className={cn(
          "bg-[#16a34a] text-white hover:bg-[#0e7a32]",
          className,
        )}
      >
        <Download className="h-4 w-4" />
        <span>{label}</span>
      </Button>
      {feedback && (
        <span
          role="status"
          aria-live="polite"
          data-testid="export-feedback"
          className={cn(
            "text-xs mt-2 block",
            feedback.type === "success"
              ? "text-green-600"
              : "text-red-600",
          )}
        >
          {feedback.message}
        </span>
      )}
    </>
  );
}
