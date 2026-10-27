"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { Trash2, Plus } from "lucide-react"
import { type ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/shared/DataTable"
import { formatDateToDB, formatDateFromDB } from "@/lib/date-utils"

export default function EmprestimosPage() {
  const [emprestimos, setEmprestimos] = useState<any[]>([])
  const [combustiveis, setCombustiveis] = useState<any[]>([])
  const [postos, setPostos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ combustivel_id: "", volume: 0, posto_origem_id: "", posto_destino_id: "", data: new Date(), observacao: "" })

  async function fetchData() {
    setLoading(true)
    const dateStr = formatDateToDB(selectedDate)
    const [empRes, combRes, postosRes] = await Promise.all([
      fetch(`/api/emprestimos?data=${dateStr}`),
      fetch("/api/cadastros/combustiveis"),
      fetch("/api/cadastros/postos"),
    ])
    const empData = await empRes.json()
    const combData = await combRes.json()
    const postosData = await postosRes.json()
    if (!empRes.ok) alert(empData?.error || "Erro ao carregar emprestimos")
    if (!combRes.ok) alert(combData?.error || "Erro ao carregar combustiveis")
    if (!postosRes.ok) alert(postosData?.error || "Erro ao carregar postos")
    setEmprestimos(Array.isArray(empData) ? empData : [])
    setCombustiveis(Array.isArray(combData) ? combData : [])
    setPostos(Array.isArray(postosData) ? postosData : [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [selectedDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/emprestimos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, data_emprestimo: formatDateToDB(form.data) }),
    })
    setModalOpen(false)
    setForm({ combustivel_id: "", volume: 0, posto_origem_id: "", posto_destino_id: "", data: new Date(), observacao: "" })
    fetchData()
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/emprestimos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este empréstimo?")) return
    await fetch(`/api/emprestimos?id=${id}`, { method: "DELETE" })
    fetchData()
  }

  const STATUS_LABELS: Record<string, string> = { pendente: "Pendente", devolvido_parcial: "Dev. Parcial", devolvido: "Devolvido" }
  const STATUS_COLORS: Record<string, string> = { pendente: "bg-yellow-100 text-yellow-800", devolvido_parcial: "bg-orange-100 text-orange-800", devolvido: "bg-green-100 text-green-800" }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Emprestimos</h1>
          <DatePicker date={selectedDate} onChange={setSelectedDate} />
        </div>
        <button onClick={() => { setForm({ combustivel_id: "", volume: 0, posto_origem_id: "", posto_destino_id: "", data: new Date(), observacao: "" }); setModalOpen(true) }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
          <Plus className="h-4 w-4" /> Novo Emprestimo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Carregando...</div>
      ) : (
        <DataTable
          columns={[
            { accessorKey: "combustivel", header: "Combustivel", cell: ({ row }: any) => row.original.combustivel?.abreviacao || "-", enableColumnFilter: true },
            { accessorKey: "volume", header: "Volume (L)", cell: ({ row }: any) => row.original.volume?.toLocaleString("pt-BR") },
            { accessorKey: "origem", header: "Origem", cell: ({ row }: any) => row.original.posto_origem?.abreviacao || "-", enableColumnFilter: true },
            { accessorKey: "destino", header: "Destino", cell: ({ row }: any) => row.original.posto_destino?.abreviacao || "-", enableColumnFilter: true },
            { accessorKey: "data", header: "Data", cell: ({ row }: any) => formatDateFromDB(row.original.data_emprestimo) },
            { accessorKey: "status", header: "Status", cell: ({ row }: any) => (
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[row.original.status] || "bg-gray-100 dark:bg-gray-800"}`}>{STATUS_LABELS[row.original.status] || row.original.status}</span>
                <select value={row.original.status} onChange={(ev) => handleStatusChange(row.original.id, ev.target.value)} className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
              </div>
            ), enableColumnFilter: true },
            { id: "acoes", header: "Ações", cell: ({ row }: any) => (
              <button onClick={() => handleDelete(row.original.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
                <Trash2 className="h-4 w-4" />
              </button>
            ), enableSorting: false, enableColumnFilter: false },
          ] as ColumnDef<any, any>[]}
          data={emprestimos}
          loading={false}
          emptyMessage={`Nenhum emprestimo para o dia ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`}
        />
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Novo Emprestimo</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Combustivel</label>
                  <select value={form.combustivel_id} onChange={(e) => setForm({ ...form, combustivel_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {combustiveis.map((c) => (<option key={c.id} value={c.id}>{c.abreviacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Volume (L)</label>
                  <input type="number" value={form.volume} onChange={(e) => setForm({ ...form, volume: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Posto Origem</label>
                  <select value={form.posto_origem_id} onChange={(e) => setForm({ ...form, posto_origem_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {postos.map((p) => (<option key={p.id} value={p.id}>{p.abreviacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Posto Destino</label>
                  <select value={form.posto_destino_id} onChange={(e) => setForm({ ...form, posto_destino_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {postos.map((p) => (<option key={p.id} value={p.id}>{p.abreviacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data do Emprestimo</label>
                  <DatePicker date={form.data} onChange={(d) => setForm({ ...form, data: d })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Observacao</label>
                  <input type="text" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Criar Emprestimo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
