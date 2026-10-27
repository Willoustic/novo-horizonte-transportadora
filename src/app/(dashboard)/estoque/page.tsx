"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { Trash2, Plus } from "lucide-react"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/shared/DataTable"
import { formatDateToDB, formatDateFromDB } from "@/lib/date-utils"

export default function EstoquePage() {
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [tanques, setTanques] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ tanque_posto_id: "", volume: 0, data: new Date() })

  async function fetchData() {
    setLoading(true)
    const dateStr = formatDateToDB(selectedDate)
    const [snapRes, tanqRes] = await Promise.all([
      fetch(`/api/estoque?data=${dateStr}`),
      fetch("/api/cadastros/tanques-posto"),
    ])
    setSnapshots(await snapRes.json())
    setTanques(await tanqRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [selectedDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/estoque", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, data: formatDateToDB(form.data) }),
    })
    setModalOpen(false)
    setForm({ tanque_posto_id: "", volume: 0, data: selectedDate })
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este registro de estoque?")) return
    await fetch(`/api/estoque?id=${id}`, { method: "DELETE" })
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Estoque</h1>
          <DatePicker date={selectedDate} onChange={setSelectedDate} />
        </div>
        <button onClick={() => { setForm({ tanque_posto_id: "", volume: 0, data: selectedDate }); setModalOpen(true) }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
          <Plus className="h-4 w-4" /> Registrar Volume
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Carregando...</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: "posto", header: "Posto", cell: ({ row }: any) => row.original.tanque_posto?.posto?.abreviacao || "-", enableColumnFilter: true },
            { accessorKey: "tanque", header: "Tanque", cell: ({ row }: any) => `Tanque ${row.original.tanque_posto?.numero}`, enableColumnFilter: true },
            { accessorKey: "combustivel", header: "Combustivel", cell: ({ row }: any) => row.original.tanque_posto?.combustivel?.abreviacao || "-", enableColumnFilter: true },
            { accessorKey: "volume", header: "Volume (L)", cell: ({ row }: any) => row.original.volume?.toLocaleString("pt-BR") },
            { accessorKey: "capacidade", header: "Capacidade", cell: ({ row }: any) => row.original.tanque_posto?.capacidade_litros?.toLocaleString("pt-BR") },
            { accessorKey: "estoque_min", header: "Estoque Min.", cell: ({ row }: any) => row.original.tanque_posto?.estoque_minimo?.toLocaleString("pt-BR") },
            { accessorKey: "status", header: "Status", cell: ({ row }: any) => {
              const tp = row.original.tanque_posto
              const below = tp && row.original.volume < tp.estoque_minimo
              return <span className={`px-2 py-1 rounded-full text-xs font-medium ${below ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>{below ? "Abaixo do Minimo" : "OK"}</span>
            }, enableColumnFilter: true },
            { id: "acoes", header: "Ações", cell: ({ row }: any) => (
              <button onClick={() => handleDelete(row.original.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            ), enableSorting: false, enableColumnFilter: false },
          ] as ColumnDef<any, any>[]}
          data={snapshots}
          loading={false}
          emptyMessage={`Nenhum snapshot para o dia ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`}
        />
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Registrar Volume</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Tanque do Posto</label>
                <select value={form.tanque_posto_id} onChange={(e) => setForm({ ...form, tanque_posto_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" required>
                  <option value="">Selecione...</option>
                  {tanques.map((t) => (<option key={t.id} value={t.id}>Tanque {t.numero}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Volume (L)</label>
                <input type="number" value={form.volume} onChange={(e) => setForm({ ...form, volume: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data</label>
                <DatePicker date={form.data} onChange={(d) => setForm({ ...form, data: d })} />
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
