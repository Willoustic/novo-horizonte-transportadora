"use client"

import { useState } from "react"
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  loading?: boolean
  emptyMessage?: string
}

export function DataTable<TData>({ columns, data, loading, emptyMessage }: DataTableProps<TData>) {
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [sorting, setSorting] = useState<any[]>([])

  const table = useReactTable({
    data,
    columns,
    state: {
      columnFilters: Object.entries(columnFilters).reduce((acc, [id, value]) => {
        if (value) acc.push({ id, value })
        return acc
      }, [] as any[]),
      sorting,
    },
    onColumnFiltersChange: (updater) => {
      const next = typeof updater === "function" ? updater(
        Object.entries(columnFilters).reduce((acc, [id, value]) => {
          if (value) acc.push({ id, value })
          return acc
        }, [] as any[])
      ) : updater
      const map: Record<string, string> = {}
      next.forEach((f: any) => { map[f.id] = f.value })
      setColumnFilters(map)
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (loading) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Carregando...</div>

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-auto max-h-[70vh]">
      <Table>
        <TableHeader className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((h) => (
                <TableHead key={h.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={h.column.getToggleSortingHandler()}
                      className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-200"
                    >
                      {flexRender(h.column.columnDef.header, h.getContext())}
                      {h.column.getIsSorted() === "asc" ? " ↑" : h.column.getIsSorted() === "desc" ? " ↓" : ""}
                    </button>
                    {h.column.getCanFilter() && (
                      <input
                        value={(columnFilters[h.column.id] as string) ?? ""}
                        onChange={(e) => setColumnFilters((p) => ({ ...p, [h.column.id]: e.target.value }))}
                        placeholder="Filtrar..."
                        className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200"
                      />
                    )}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                {emptyMessage || "Nenhum registro encontrado"}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}