"use client"

import { useState, useEffect } from "react"

interface Carregamento {
  id: string
  posto_destino_id: string
  motorista_id: string
  cavalo_id: string
  tanque_carreta_id: string
  volume: number
  base_origem: string | null
  status: string
  data_saida: string | null
  data_chegada: string | null
  created_at: string
  posto_destino?: { nome: string; abreviacao: string }
  motorista?: { nome: string }
  cavalo?: { placa: string }
  tanque_carreta?: { identificacao: string }
}

const STATUS_LABELS: Record<string, string> = {
  carregando: "Carregando",
  em_transito: "Em Transito",
  entregue: "Entregue",
  devolvido: "Devolvido",
  cancelado: "Cancelado",
}

const STATUS_COLORS: Record<string, string> = {
  carregando: "bg-yellow-100 text-yellow-800",
  em_transito: "bg-blue-100 text-blue-800",
  entregue: "bg-green-100 text-green-800",
  devolvido: "bg-orange-100 text-orange-800",
  cancelado: "bg-red-100 text-red-800",
}

export default function CarregamentosPage() {
  const [carregamentos, setCarregamentos] = useState<Carregamento[]>([])
  const [motoristas, setMotoristas] = useState<any[]>([])
  const [cavalos, setCavalos] = useState<any[]>([])
  const [tanquesCarreta, setTanquesCarreta] = useState<any[]>([])
  const [postos, setPostos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({
    posto_destino_id: "", motorista_id: "", cavalo_id: "", tanque_carreta_id: "",
    volume: 0, base_origem: "", status: "carregando",
  })

  async function fetchData() {
    setLoading(true)
    const [carregRes, motRes, cavRes, tanqRes, postosRes] = await Promise.all([
      fetch("/api/carregamentos"),
      fetch("/api/cadastros/motoristas"),
      fetch("/api/cadastros/cavalos"),
      fetch("/api/cadastros/tanques-carreta"),
      fetch("/api/cadastros/postos"),
    ])
    setCarregamentos(await carregRes.json())
    setMotoristas(await motRes.json())
    setCavalos(await cavRes.json())
    setTanquesCarreta(await tanqRes.json())
    setPostos(await postosRes.json())
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await fetch("/api/carregamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    setModalOpen(false)
    setForm({ posto_destino_id: "", motorista_id: "", cavalo_id: "", tanque_carreta_id: "", volume: 0, base_origem: "", status: "carregando" })
    fetchData()
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/carregamentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    })
    fetchData()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Carregamentos</h1>
        <button onClick={() => { setForm({ posto_destino_id: "", motorista_id: "", cavalo_id: "", tanque_carreta_id: "", volume: 0, base_origem: "", status: "carregando" }); setModalOpen(true) }} className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
          + Novo Carregamento
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Destino</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motorista</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cavalo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanque Carreta</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Volume (L)</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base Origem</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {carregamentos.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">Nenhum carregamento encontrado</td></tr>
              ) : (
                carregamentos.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{c.posto_destino?.abreviacao || c.posto_destino_id}</td>
                    <td className="px-4 py-3 text-sm">{c.motorista?.nome || "-"}</td>
                    <td className="px-4 py-3 text-sm">{c.cavalo?.placa || "-"}</td>
                    <td className="px-4 py-3 text-sm">{c.tanque_carreta?.identificacao || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right">{c.volume?.toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-3 text-sm">{c.base_origem || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[c.status] || "bg-gray-100 text-gray-800"}`}>
                          {STATUS_LABELS[c.status] || c.status}
                        </span>
                        <select value={c.status} onChange={(e) => handleStatusChange(c.id, e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1">
                          {Object.entries(STATUS_LABELS).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{new Date(c.created_at).toLocaleDateString("pt-BR")}</td>
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
            <h2 className="text-lg font-bold mb-4">Novo Carregamento</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posto Destino</label>
                  <select value={form.posto_destino_id} onChange={(e) => setForm({ ...form, posto_destino_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {postos.map((p) => (<option key={p.id} value={p.id}>{p.abreviacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motorista</label>
                  <select value={form.motorista_id} onChange={(e) => setForm({ ...form, motorista_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {motoristas.map((m) => (<option key={m.id} value={m.id}>{m.nome}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cavalo</label>
                  <select value={form.cavalo_id} onChange={(e) => setForm({ ...form, cavalo_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {cavalos.map((c) => (<option key={c.id} value={c.id}>{c.placa}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tanque Carreta</label>
                  <select value={form.tanque_carreta_id} onChange={(e) => setForm({ ...form, tanque_carreta_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {tanquesCarreta.map((t) => (<option key={t.id} value={t.id}>{t.identificacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Volume (L)</label>
                  <input type="number" value={form.volume} onChange={(e) => setForm({ ...form, volume: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Origem</label>
                  <input type="text" value={form.base_origem} onChange={(e) => setForm({ ...form, base_origem: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Criar Carregamento</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}