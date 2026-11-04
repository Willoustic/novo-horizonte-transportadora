"use client";

import { useState, useMemo } from "react";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<TData>({
  columns,
  data,
  loading,
  emptyMessage,
}: DataTableProps<TData>) {
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>(
    {},
  );
  const [sorting, setSorting] = useState<any[]>([]);

  const cellValue = (row: any, col: any): any => {
    if (col.accessorKey) return row[col.accessorKey];
    if (col.accessorFn) return col.accessorFn(row);
    return row[col.id];
  };

  const columnsWithFilter = useMemo(
    () =>
      columns.map((col: any) => {
        if (!col.filterValue && col.accessorFn) {
          return { ...col, filterValue: (row: any) => col.accessorFn!(row) };
        }
        return col;
      }),
    [columns],
  );

  const distinctValues = useMemo(() => {
    const map: Record<string, string[]> = {};
    columnsWithFilter.forEach((c: any) => {
      const id = c.accessorKey || c.id;
      if (!id) return;
      const vals = Array.from(
        new Set(
          data.map((row: any) => {
            const v = cellValue(row, c);
            return v == null ? "" : String(v);
          }),
        ),
      )
        .filter((v) => v !== "")
        .sort();
      map[id] = vals;
    });
    return map;
  }, [data, columnsWithFilter]);

  const tableState = useMemo(
    () => ({
      columnFilters: Object.entries(columnFilters)
        .filter(([, v]) => v)
        .map(([id, value]) => ({ id, value })),
      sorting,
    }),
    [columnFilters, sorting],
  );

  const table = useReactTable({
    data,
    columns: columnsWithFilter,
    state: tableState,
    onColumnFiltersChange: (updater) => {
      const prev = Object.entries(columnFilters)
        .filter(([, v]) => v)
        .map(([id, value]) => ({ id, value }));
      const next = typeof updater === "function" ? updater(prev) : updater;
      const map: Record<string, string> = {};
      next.forEach((f: any) => {
        map[f.id] = f.value;
      });
      setColumnFilters(map);
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (loading)
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Carregando...
      </div>
    );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-auto max-h-[70vh]">
      <Table className="min-w-full">
        <TableHeader className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => {
                const colId = h.column.id;
                const canFilter = !!(h.column.columnDef as any)
                  .enableColumnFilter;
                return (
                  <TableHead
                    key={h.id}
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap"
                  >
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={h.column.getToggleSortingHandler()}
                        className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                      >
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc"
                          ? " ↑"
                          : h.column.getIsSorted() === "desc"
                            ? " ↓"
                            : ""}
                      </button>
                      {canFilter && (
                        <select
                          value={columnFilters[colId] ?? ""}
                          onChange={(e) =>
                            setColumnFilters((p) => ({
                              ...p,
                              [colId]: e.target.value,
                            }))
                          }
                          className="text-xs px-1 py-0.5 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 max-w-[140px]"
                        >
                          <option value="">Todos</option>
                          {(distinctValues[colId] || []).map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
              >
                {emptyMessage || "Nenhum registro encontrado"}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                className="hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 whitespace-nowrap"
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
