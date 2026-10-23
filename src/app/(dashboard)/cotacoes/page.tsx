"use client"

import { useState, useEffect } from "react"

export default function CotacoesPage() {
  const [cotacoes, setCotacoes] = useState<any[]>([])
  const [postos, setPostos] = useState<any[]>([])
  const [combustiveis, setCombustiveis] = useState<any[]>([])
  const [fornecedores, setFornecedores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ posto_id: "", combustivel_id: "", fornecedor_id: "", preco: 0, fonte: "manual" })

  async function fetchData() {
    setLoading(true)
    const [cotRes, postosRes, combRes, fornRes] = await Promise.all([
      fetch("/api/cotacoes"),
      fetch("/api/cadastros/postos"),
      fetch("/api/cadastros/combustiveis"),
      fetch("/api/cadastros/fornecedores"),
    ])
    setCotacoes(await cotRes.json())
    setPostos(await postosRes.json())
    setCombustiveis(await combRes.json())
    setFornecedores(await fornRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/cotacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setModalOpen(false)
    setForm({ posto_id: "", combustivel_id: "", fornecedor_id: "", preco: 0, fonte: "manual" })
    fetchData()
  }

  const FONTES: Record<string, string> = { vibra: "Vibra", whatsapp: "WhatsApp", manual: "Manual" }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cotacoes</h1>
        <button onClick={() => { setForm({ posto_id: "", combustivel_id: "", fornecedor_id: "", preco: 0, fonte: "manual" }); setModalOpen(true) }} className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
          + Nova Cotacao
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Combustivel</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preco</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fonte</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cotacoes.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Nenhuma cotacao encontrada</td></tr>
              ) : (
                cotacoes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{c.posto?.abreviacao || "-"}</td>
                    <td className="px-4 py-3 text-sm">{c.combustivel?.abreviacao || "-"}</td>
                    <td className="px-4 py-3 text-sm">{c.fornecedor?.nome || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">R$ {c.preco?.toFixed(4)}</td>
                    <td className="px-4 py-3 text-sm">{FONTES[c.fonte] || c.fonte}</td>
                    <td className="px-4 py-3 text-sm">{new Date(c.data_registro).toLocaleDateString("pt-BR")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-lg font-bold mb-4">Nova Cotacao</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posto</label>
                  <select value={form.posto_id} onChange={(e) => setForm({ ...form, posto_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {postos.map((p) => (<option key={p.id} value={p.id}>{p.abreviacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Combustivel</label>
                  <select value={form.combustivel_id} onChange={(e) => setForm({ ...form, combustivel_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {combustiveis.map((c) => (<option key={c.id} value={c.id}>{c.abreviacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                  <select value={form.fornecedor_id} onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {fornecedores.map((f) => (<option key={f.id} value={f.id}>{f.nome}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preco</label>
                  <input type="number" step="0.0001" value={form.preco} onChange={(e) => setForm({ ...form, preco: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label>
                  <select value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="manual">Manual</option>
                    <option value="vibra">Vibra</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar Cotacao</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}