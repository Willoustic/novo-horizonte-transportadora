"use client";

import { useState, useEffect } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";

interface Column {
  key: string;
  label: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface CadastroTableProps {
  title: string;
  columns: Column[];
  data: any[];
  loading: boolean;
  onNew: () => void;
  onEdit: (row: any) => void;
  onDelete: (id: string) => void;
}

export function CadastroTable({
  title,
  columns,
  data,
  loading,
  onNew,
  onEdit,
  onDelete,
}: CadastroTableProps) {
  const cols: ColumnDef<any, any>[] = [
    ...columns.map((col) => ({
      accessorKey: col.key,
      header: col.label,
      cell: ({ row }: any) =>
        col.render
          ? col.render(row.original[col.key], row.original)
          : (row.original[col.key] ?? "-"),
      enableColumnFilter: true,
    })),
    {
      id: "acoes",
      header: "Acoes",
      cell: ({ row }: any) => (
        <div className="text-right space-x-2">
          <button
            onClick={() => onEdit(row.original)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Editar
          </button>
          <button
            onClick={() => onDelete(row.original.id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Excluir
          </button>
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {title}
        </h1>
        <button
          onClick={onNew}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          + Novo
        </button>
      </div>
      <DataTable
        columns={cols}
        data={data}
        loading={loading}
        emptyMessage="Nenhum registro encontrado"
      />
    </div>
  );
}
