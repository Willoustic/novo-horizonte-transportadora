"use client"

import { useState, useEffect } from "react"

export default function EmprestimosPage() {
  const [emprestimos, setEmprestimos] = useState<any[]>([])
  const [combustiveis, setCombustiveis] = useState<any[]>([])
  const [postos, setPostos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ combustivel_id: "", volume: 0, posto_origem_id: "", posto_destino_id: "", data_emprestimo: new Date().toISOString().split("T")[0], observacao: "" })

  async function fetchData() {
    setLoading(true)
    const [empRes, combRes, postosRes] = await Promise.all([
      fetch("/api/emprestimos"),
      fetch("/api/cadastros/combustiveis"),
      fetch("/api/cadastros/postos"),
    ])
    setEmprestimos(await empRes.json())
    setCombustiveis(await combRes.json())
    setPostos(await postosRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/emprestimos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setModalOpen(false)
    setForm({ combustivel_id: "", volume: 0, posto_origem_id: "", posto_destino_id: "", data_emprestimo: new Date().toISOString().split("T")[0], observacao: "" })
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

  const STATUS_LABELS: Record<string, string> = { pendente: "Pendente", devolvido_parcial: "Dev. Parcial", devolvido: "Devolvido" }
  const STATUS_COLORS: Record<string, string> = { pendente: "bg-yellow-100 text-yellow-800", devolvido_parcial: "bg-orange-100 text-orange-800", devolvido: "bg-green-100 text-green-800" }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Emprestimos</h1>
        <button onClick={() => { setForm({ combustivel_id: "", volume: 0, posto_origem_id: "", posto_destino_id: "", data_emprestimo: new Date().toISOString().split("T")[0], observacao: "" }); setModalOpen(true) }} className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
          + Novo Emprestimo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Combustivel</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Volume (L)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Origem</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {emprestimos.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nenhum emprestimo encontrado</td></tr>
              ) : (
                emprestimos.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{e.combustivel?.abreviacao || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right">{e.volume?.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-sm">{e.posto_origem?.abreviacao || "-"}</td>
                    <td className="px-4 py-3 text-sm">{e.posto_destino?.abreviacao || "-"}</td>
                    <td className="px-4 py-3 text-sm">{e.data_emprestimo}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] || "bg-gray-100"}`}>{STATUS_LABELS[e.status] || e.status}</span>
                        <select value={e.status} onChange={(ev) => handleStatusChange(e.id, ev.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1">
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl shadow-xl">
            <h2 className="text-lg font-bold mb-4">Novo Emprestimo</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Combustivel</label>
                  <select value={form.combustivel_id} onChange={(e) => setForm({ ...form, combustivel_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {combustiveis.map((c) => (<option key={c.id} value={c.id}>{c.abreviacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume (L)</label>
                  <input type="number" value={form.volume} onChange={(e) => setForm({ ...form, volume: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posto Origem</label>
                  <select value={form.posto_origem_id} onChange={(e) => setForm({ ...form, posto_origem_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {postos.map((p) => (<option key={p.id} value={p.id}>{p.abreviacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posto Destino</label>
                  <select value={form.posto_destino_id} onChange={(e) => setForm({ ...form, posto_destino_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {postos.map((p) => (<option key={p.id} value={p.id}>{p.abreviacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <input type="date" value={form.data_emprestimo} onChange={(e) => setForm({ ...form, data_emprestimo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observacao</label>
                  <input type="text" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Criar Emprestimo</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}