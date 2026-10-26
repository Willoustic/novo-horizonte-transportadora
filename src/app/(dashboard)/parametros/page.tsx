"use client"

import { useState, useEffect } from "react"

interface Parametro {
  id: string
  grupo: string
  chave: string
  valor: string
  descricao: string | null
}

const GRUPOS = ["vibra", "gmail", "geral"]

export default function ParametrosPage() {
  const [data, setData] = useState<Parametro[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Parametro | null>(null)
  const [form, setForm] = useState({ grupo: "vibra", chave: "", valor: "", descricao: "" })
  const [showValue, setShowValue] = useState(false)

  async function fetchData() {
    setLoading(true)
    const res = await fetch("/api/parametros")
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = editing ? "PUT" : "POST"
    const url = editing ? `/api/parametros/${editing.id}` : "/api/parametros"
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setModalOpen(false)
    setEditing(null)
    setForm({ grupo: "vibra", chave: "", valor: "", descricao: "" })
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja excluir este parametro?")) return
    await fetch(`/api/parametros/${id}`, { method: "DELETE" })
    fetchData()
  }

  function handleEdit(row: Parametro) {
    setEditing(row)
    setForm({ grupo: row.grupo, chave: row.chave, valor: "", descricao: row.descricao || "" })
    setModalOpen(true)
  }

  const isSensitive = (chave: string) => {
    const lower = chave.toLowerCase()
    return ["senha", "login", "email", "senha_app", "password", "imap"].some((k) => lower.includes(k))
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Parametros</h1>
        <button
          onClick={() => { setEditing(null); setForm({ grupo: "vibra", chave: "", valor: "", descricao: "" }); setModalOpen(true) }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          + Novo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chave</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descricao</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum parametro encontrado</td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700">{row.grupo}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.chave}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                      {isSensitive(row.chave) ? "••••••••" : row.valor}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.descricao || "-"}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>
                      <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Excluir</button>
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">{editing ? "Editar Parametro" : "Novo Parametro"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
                <select value={form.grupo} onChange={(e) => setForm({ ...form, grupo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                  {GRUPOS.map((g) => (<option key={g} value={g}>{g}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chave</label>
                <input value={form.chave} onChange={(e) => setForm({ ...form, chave: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor {isSensitive(form.chave) && <span className="text-xs text-red-500">(sera criptografado)</span>}
                </label>
                <input
                  type={isSensitive(form.chave) && !showValue ? "password" : "text"}
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required={!editing}
                  placeholder={editing ? "Deixe vazio para manter o valor atual" : ""}
                />
                {isSensitive(form.chave) && (
                  <button type="button" onClick={() => setShowValue(!showValue)} className="text-xs text-blue-600 mt-1">
                    {showValue ? "Ocultar" : "Mostrar"}
                  </button>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descricao</label>
                <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
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