"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { createClient } from "@/lib/supabase/client"
import { formatDateToDB, formatDateFromDB } from "@/lib/date-utils"
import { Trash2, Plus, Calendar as CalendarIcon, ClipboardList } from "lucide-react"

interface Posto { id: string; nome: string; abreviacao: string; tipo: string }
interface Combustivel { id: string; nome: string; abreviacao: string }
interface Fornecedor { id: string; nome: string }
interface Base { id: string; nome: string; abreviacao: string }
interface ItemPedido { combustivel_id: string; quantidade_litros: number; fornecedor_id: string; preco_unitario: number; base_id?: string }
interface Pedido { id: string; posto_id: string; status: string; observacoes: string | null; data: string; created_at: string; posto?: { nome: string; abreviacao: string }; itens?: any[] }

const STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  em_carregamento: "Em Carregamento",
  concluido: "Concluido",
  cancelado: "Cancelado",
}

const STATUS_COLORS: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-blue-100 text-blue-800",
  em_carregamento: "bg-purple-100 text-purple-800",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [combustiveis, setCombustiveis] = useState<Combustivel[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [bases, setBases] = useState<Base[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ 
    posto_id: "", 
    observacoes: "", 
    data: new Date(), 
    itens: [] as ItemPedido[] 
  })
  const [newItem, setNewItem] = useState({ combustivel_id: "", quantidade_litros: 0, fornecedor_id: "", base_id: "", preco_unitario: 0 })
  
  const supabase = createClient()

  async function fetchData() {
    setLoading(true)
    const dateStr = formatDateToDB(selectedDate)
    
    const [pedidosRes, postosRes, combRes, fornRes, basesRes] = await Promise.all([
      fetch(`/api/pedidos?data=${dateStr}`),
      fetch("/api/cadastros/postos"),
      fetch("/api/cadastros/combustiveis"),
      fetch("/api/cadastros/fornecedores"),
      fetch("/api/cadastros/bases"),
    ])
    
    setPedidos(await pedidosRes.json())
    setPostos(await postosRes.json())
    setCombustiveis(await combRes.json())
    setFornecedores(await fornRes.json())
    setBases(await basesRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [selectedDate])

  function addItem() {
    if (!newItem.combustivel_id || !newItem.fornecedor_id || !newItem.base_id || newItem.quantidade_litros <= 0) return
    setForm({ ...form, itens: [...form.itens, { ...newItem }] })
    setNewItem({ combustivel_id: "", quantidade_litros: 0, fornecedor_id: "", base_id: "", preco_unitario: 0 })
  }

  function removeItem(idx: number) {
    setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.itens.length === 0) { alert("Adicione pelo menos um item"); return }
    
    const payload = {
      posto_id: form.posto_id,
      observacoes: form.observacoes,
      data: formatDateToDB(form.data),
      itens: form.itens,
    }

    const res = await fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    
    if (!res.ok) {
      const err = await res.json()
      alert("Erro ao criar pedido: " + (err.error || "erro desconhecido"))
      return
    }

    setModalOpen(false)
    setForm({ posto_id: "", observacoes: "", data: new Date(), itens: [] })
    fetchData()
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/pedidos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert("Erro ao atualizar status: " + (err.error || "erro desconhecido"))
      return
    }
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este pedido?")) return
    const res = await fetch(`/api/pedidos/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert("Erro ao excluir pedido: " + (err.error || "erro desconhecido"))
      return
    }
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pedidos</h1>
          <DatePicker 
            date={selectedDate} 
            onChange={setSelectedDate} 
          />
        </div>
        <button 
          onClick={() => { setForm({ posto_id: "", observacoes: "", data: new Date(), itens: [] }); setModalOpen(true) }} 
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Pedido
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-4">
          {pedidos.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500 dark:text-gray-400">
              Não há pedidos para o dia {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
            </div>
          ) : (
            pedidos.map((pedido) => (
              <div key={pedido.id} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 relative group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-50 p-2 rounded-lg">
                      <ClipboardList className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{pedido.posto?.abreviacao || pedido.posto_id}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Criado em: {new Date(pedido.created_at).toLocaleString("pt-BR")}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[pedido.status] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100"}`}>
                      {STATUS_LABELS[pedido.status] || pedido.status}
                    </span>
                    <select
                      value={pedido.status}
                      onChange={(e) => handleStatusChange(pedido.id, e.target.value)}
                      className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 bg-white dark:bg-gray-900"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => handleDelete(pedido.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      title="Excluir pedido"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {pedido.observacoes && (
                  <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-4 border-gray-300 dark:border-gray-600">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{pedido.observacoes}</p>
                  </div>
                )}
                {pedido.itens && pedido.itens.length > 0 && (
                  <div className="overflow-hidden rounded-lg border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr className="text-gray-500 dark:text-gray-400 text-left">
                          <th className="px-3 py-2 font-medium">Combustivel</th>
                          <th className="px-3 py-2 font-medium">Fornecedor</th>
                          <th className="px-3 py-2 font-medium">Base</th>
                          <th className="px-3 py-2 text-right font-medium">Qtd (L)</th>
                          <th className="px-3 py-2 text-right font-medium">Preco Unit.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pedido.itens.map((item: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50 dark:bg-gray-800">
                            <td className="px-3 py-2">{item.combustivel?.abreviacao || item.combustivel_id}</td>
                            <td className="px-3 py-2">{item.fornecedor?.nome || item.fornecedor_id}</td>
                            <td className="px-3 py-2">{item.base?.abreviacao || item.base_id || "-"}</td>
                            <td className="px-3 py-2 text-right">{item.quantidade_litros?.toLocaleString("pt-BR")}</td>
                            <td className="px-3 py-2 text-right">R$ {item.preco_unitario?.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Novo Pedido</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Posto</label>
                  <select value={form.posto_id} onChange={(e) => setForm({ ...form, posto_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {postos.map((p) => (<option key={p.id} value={p.id}>{p.abreviacao} - {p.nome}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Data do Pedido</label>
                  <DatePicker 
                    date={form.data} 
                    onChange={(d) => setForm({ ...form, data: d })} 
                  />
                </div>
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-gray-50 dark:bg-gray-800">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                  <Plus className="h-4 w-4" /> Adicionar Itens
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <select value={newItem.combustivel_id} onChange={(e) => setNewItem({ ...newItem, combustivel_id: e.target.value })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900">
                      <option value="">Combustivel</option>
                      {combustiveis.map((c) => (<option key={c.id} value={c.id}>{c.abreviacao}</option>))}
                  </select>
                  <input type="number" placeholder="Qtd (L)" value={newItem.quantidade_litros || ""} onChange={(e) => setNewItem({ ...newItem, quantidade_litros: parseFloat(e.target.value) })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm" />
                  <select value={newItem.fornecedor_id} onChange={(e) => setNewItem({ ...newItem, fornecedor_id: e.target.value })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900">
                      <option value="">Fornecedor</option>
                      {fornecedores.map((f) => (<option key={f.id} value={f.id}>{f.nome}</option>))}
                  </select>
                  <select value={newItem.base_id} onChange={(e) => setNewItem({ ...newItem, base_id: e.target.value })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-900">
                      <option value="">Base</option>
                      {bases.map((b) => (<option key={b.id} value={b.id}>{b.abreviacao}</option>))}
                  </select>
                  <input type="number" step="0.01" placeholder="Preco Unit." value={newItem.preco_unitario || ""} onChange={(e) => setNewItem({ ...newItem, preco_unitario: parseFloat(e.target.value) })} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm" />
                </div>
                <button type="button" onClick={addItem} className="text-sm text-green-600 font-medium hover:text-green-800 transition-colors">+ Adicionar Item</button>

                {form.itens.length > 0 && (
                  <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr className="text-gray-500 dark:text-gray-400 text-left">
                          <th className="px-3 py-2 font-medium">Combustivel</th>
                          <th className="px-3 py-2 font-medium">Fornecedor</th>
                          <th className="px-3 py-2 font-medium">Base</th>
                          <th className="px-3 py-2 text-right font-medium">Qtd</th>
                          <th className="px-3 py-2 text-right font-medium">Preco</th>
                          <th className="px-3 py-2 text-right font-medium">Acao</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {form.itens.map((item, idx) => {
                          const comb = combustiveis.find((c) => c.id === item.combustivel_id)
                          const forn = fornecedores.find((f) => f.id === item.fornecedor_id)
                          return (
                            <tr key={idx} className="hover:bg-gray-50 dark:bg-gray-800">
                              <td className="px-3 py-2">{comb?.abreviacao}</td>
                              <td className="px-3 py-2">{forn?.nome}</td>
                              <td className="px-3 py-2">{bases.find((b) => b.id === item.base_id)?.abreviacao || "-"}</td>
                              <td className="px-3 py-2 text-right">{item.quantidade_litros}</td>
                              <td className="px-3 py-2 text-right">R$ {item.preco_unitario.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right">
                                <button type="button" onClick={() => removeItem(idx)} className="text-red-600 hover:text-red-800 transition-colors">
                                  <Trash2 className="h-3.5 w-3.5 inline" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" rows={2} />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100 transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors shadow-sm">Criar Pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
