"use client"

import { useState, useEffect } from "react"

export default function EstoquePage() {
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [tanques, setTanques] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ tanque_posto_id: "", volume: 0, data: new Date().toISOString().split("T")[0] })

  async function fetchData() {
    setLoading(true)
    const [snapRes, tanqRes] = await Promise.all([
      fetch(`/api/estoque?data=${selectedDate}`),
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
      body: JSON.stringify(form),
    })
    setModalOpen(false)
    setForm({ tanque_posto_id: "", volume: 0, data: selectedDate })
    fetchData()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Estoque</h1>
        <div className="flex items-center space-x-4">
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg" />
          <button onClick={() => { setForm({ tanque_posto_id: "", volume: 0, data: selectedDate }); setModalOpen(true) }} className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
            + Registrar Volume
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tanque</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Combustivel</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Volume (L)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Capacidade</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Estoque Min.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {snapshots.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum snapshot para esta data</td></tr>
              ) : (
                snapshots.map((s) => {
                  const tp = s.tanque_posto
                  const below = tp && s.volume < tp.estoque_minimo
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm">{tp?.posto?.abreviacao || "-"}</td>
                      <td className="px-4 py-3 text-sm">Tanque {tp?.numero}</td>
                      <td className="px-4 py-3 text-sm">{tp?.combustivel?.abreviacao || "-"}</td>
                      <td className="px-4 py-3 text-sm text-right font-medium">{s.volume?.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-sm text-right">{tp?.capacidade_litros?.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3 text-sm text-right">{tp?.estoque_minimo?.toLocaleString("pt-BR")}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${below ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                          {below ? "Abaixo do Minimo" : "OK"}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">Registrar Volume</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tanque do Posto</label>
                <select value={form.tanque_posto_id} onChange={(e) => setForm({ ...form, tanque_posto_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                  <option value="">Selecione...</option>
                  {tanques.map((t) => (<option key={t.id} value={t.id}>Tanque {t.numero}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Volume (L)</label>
                <input type="number" value={form.volume} onChange={(e) => setForm({ ...form, volume: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}