"use client"

import { useState, useEffect } from "react"

interface Posto { id: string; nome: string; abreviacao: string; tipo: string }
interface Combustivel { id: string; nome: string; abreviacao: string }
interface Fornecedor { id: string; nome: string }
interface ItemPedido { combustivel_id: string; quantidade_litros: number; fornecedor_id: string; preco_unitario: number }
interface Pedido { id: string; posto_id: string; status: string; observacoes: string | null; created_at: string; posto?: { nome: string; abreviacao: string }; itens?: any[] }

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
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ posto_id: "", observacoes: "", itens: [] as ItemPedido[] })
  const [newItem, setNewItem] = useState({ combustivel_id: "", quantidade_litros: 0, fornecedor_id: "", preco_unitario: 0 })

  async function fetchData() {
    setLoading(true)
    const [pedidosRes, postosRes, combRes, fornRes] = await Promise.all([
      fetch("/api/pedidos"),
      fetch("/api/cadastros/postos"),
      fetch("/api/cadastros/combustiveis"),
      fetch("/api/cadastros/fornecedores"),
    ])
    setPedidos(await pedidosRes.json())
    setPostos(await postosRes.json())
    setCombustiveis(await combRes.json())
    setFornecedores(await fornRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function addItem() {
    if (!newItem.combustivel_id || !newItem.fornecedor_id || newItem.quantidade_litros <= 0) return
    setForm({ ...form, itens: [...form.itens, { ...newItem }] })
    setNewItem({ combustivel_id: "", quantidade_litros: 0, fornecedor_id: "", preco_unitario: 0 })
  }

  function removeItem(idx: number) {
    setForm({ ...form, itens: form.itens.filter((_, i) => i !== idx) })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.itens.length === 0) { alert("Adicione pelo menos um item"); return }
    await fetch("/api/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setModalOpen(false)
    setForm({ posto_id: "", observacoes: "", itens: [] })
    fetchData()
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/pedidos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pedidos</h1>
        <button onClick={() => { setForm({ posto_id: "", observacoes: "", itens: [] }); setModalOpen(true) }} className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
          + Novo Pedido
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <div className="space-y-4">
          {pedidos.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">Nenhum pedido encontrado</div>
          ) : (
            pedidos.map((pedido) => (
              <div key={pedido.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{pedido.posto?.abreviacao || pedido.posto_id}</h3>
                    <p className="text-sm text-gray-500">{new Date(pedido.created_at).toLocaleDateString("pt-BR")}</p>
                    {pedido.observacoes && <p className="text-sm text-gray-600 mt-1">{pedido.observacoes}</p>}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[pedido.status] || "bg-gray-100 text-gray-800"}`}>
                      {STATUS_LABELS[pedido.status] || pedido.status}
                    </span>
                    <select
                      value={pedido.status}
                      onChange={(e) => handleStatusChange(pedido.id, e.target.value)}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {pedido.itens && pedido.itens.length > 0 && (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Combustivel</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Fornecedor</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Qtd (L)</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Preco Unit.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pedido.itens.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-3 py-2">{item.combustivel?.abreviacao || item.combustivel_id}</td>
                          <td className="px-3 py-2">{item.fornecedor?.nome || item.fornecedor_id}</td>
                          <td className="px-3 py-2 text-right">{item.quantidade_litros?.toLocaleString("pt-BR")}</td>
                          <td className="px-3 py-2 text-right">R$ {item.preco_unitario?.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">Novo Pedido</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Posto</label>
                <select value={form.posto_id} onChange={(e) => setForm({ ...form, posto_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                  <option value="">Selecione...</option>
                  {postos.map((p) => (<option key={p.id} value={p.id}>{p.abreviacao} - {p.nome}</option>))}
                </select>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Adicionar Item</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
                  <select value={newItem.combustivel_id} onChange={(e) => setNewItem({ ...newItem, combustivel_id: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Combustivel</option>
                    {combustiveis.map((c) => (<option key={c.id} value={c.id}>{c.abreviacao}</option>))}
                  </select>
                  <input type="number" placeholder="Qtd (L)" value={newItem.quantidade_litros || ""} onChange={(e) => setNewItem({ ...newItem, quantidade_litros: parseFloat(e.target.value) })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  <select value={newItem.fornecedor_id} onChange={(e) => setNewItem({ ...newItem, fornecedor_id: e.target.value })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                    <option value="">Fornecedor</option>
                    {fornecedores.map((f) => (<option key={f.id} value={f.id}>{f.nome}</option>))}
                  </select>
                  <input type="number" step="0.01" placeholder="Preco Unit." value={newItem.preco_unitario || ""} onChange={(e) => setNewItem({ ...newItem, preco_unitario: parseFloat(e.target.value) })} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <button type="button" onClick={addItem} className="text-sm text-green-600 font-medium hover:text-green-800">+ Adicionar Item</button>

                {form.itens.length > 0 && (
                  <table className="w-full text-sm mt-3">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-2 py-1 text-left text-xs">Combustivel</th>
                        <th className="px-2 py-1 text-left text-xs">Fornecedor</th>
                        <th className="px-2 py-1 text-right text-xs">Qtd</th>
                        <th className="px-2 py-1 text-right text-xs">Preco</th>
                        <th className="px-2 py-1 text-right text-xs">Acao</th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.itens.map((item, idx) => {
                        const comb = combustiveis.find((c) => c.id === item.combustivel_id)
                        const forn = fornecedores.find((f) => f.id === item.fornecedor_id)
                        return (
                          <tr key={idx} className="border-t border-gray-100">
                            <td className="px-2 py-1">{comb?.abreviacao}</td>
                            <td className="px-2 py-1">{forn?.nome}</td>
                            <td className="px-2 py-1 text-right">{item.quantidade_litros}</td>
                            <td className="px-2 py-1 text-right">R$ {item.preco_unitario.toFixed(2)}</td>
                            <td className="px-2 py-1 text-right">
                              <button type="button" onClick={() => removeItem(idx)} className="text-red-600 text-xs">Remover</button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observacoes</label>
                <textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" rows={2} />
              </div>

              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Criar Pedido</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}