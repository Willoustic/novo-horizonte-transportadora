"use client"

import { useState, useEffect } from "react"

interface Parametro {
  id: string
  grupo: string
  chave: string
  valor: string
  descricao: string | null
}

const POSTOS = [
  { id: "PNH2-ZN", label: "PNH2-ZN" },
  { id: "PNH1-ZS", label: "PNH1-ZS" },
  { id: "VITORIA", label: "VITORIA" },
  { id: "GLOBAL", label: "Global" },
]

const GRUPOS_GLOBAL = ["gmail", "whatsapp", "geral"]

function isVibraParam(chave: string) {
  return chave.toLowerCase().includes("vibra") || chave.toLowerCase().includes("login") || chave.toLowerCase().includes("senha")
}

export default function ParametrosPage() {
  const [data, setData] = useState<Parametro[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Parametro | null>(null)
  const [form, setForm] = useState({ grupo: "vibra", chave: "", valor: "", descricao: "" })
  const [showValue, setShowValue] = useState(false)
  const [activePosto, setActivePosto] = useState<string>("PNH2-ZN")
  const [activeGroup, setActiveGroup] = useState<string>("vibra")

  async function fetchData() {
    setLoading(true)
    const res = await fetch("/api/parametros")
    const json = await res.json()
    setData(Array.isArray(json) ? json : [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = editing ? "PUT" : "POST"
    const url = editing ? `/api/parametros/${editing.id}` : "/api/parametros"
    // prefix chave with posto if vibra param and not global
    let chave = form.chave
    if (activePosto !== "GLOBAL" && !chave.startsWith(activePosto)) {
      chave = `${activePosto}_${chave}`
    }
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, chave }) })
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
    return ["senha", "login", "email", "senha_app", "password"].some((k) => lower.includes(k))
  }

  function filteredData() {
    if (activePosto === "GLOBAL") {
      return data.filter((r) => GRUPOS_GLOBAL.includes(r.grupo))
    }
    return data.filter((r) => r.chave.startsWith(activePosto + "_"))
  }

  const visible = filteredData()

  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Parametros</h1>
        <button
          onClick={() => { setEditing(null); setForm({ grupo: activePosto === "GLOBAL" ? "gmail" : "vibra", chave: "", valor: "", descricao: "" }); setModalOpen(true) }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm"
        >
          + Novo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <div className="space-y-4">
          {/* Abas por posto */}
          <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
            {POSTOS.map((p) => (
              <button
                key={p.id}
                onClick={() => { setActivePosto(p.id); setActiveGroup("vibra") }}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activePosto === p.id
                    ? "border-green-600 text-green-700 dark:text-green-400"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {activePosto === "GLOBAL" && (
            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
              {GRUPOS_GLOBAL.map((g) => (
                <button
                  key={g}
                  onClick={() => setActiveGroup(g)}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeGroup === g
                      ? "border-green-600 text-green-700 dark:text-green-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  }`}
                >
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </button>
              ))}
            </div>
          )}

          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chave</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descricao</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">Nenhum parametro encontrado</td>
                  </tr>
                ) : (
                  visible.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.chave}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200 font-mono">
                        {isSensitive(row.chave) ? "********" : row.valor}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">{row.descricao || "-"}</td>
                      <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                        <button onClick={() => handleEdit(row)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>
                        <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Excluir</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4 text-gray-900 dark:text-white">{editing ? "Editar Parametro" : "Novo Parametro"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chave</label>
                <input value={form.chave} onChange={(e) => setForm({ ...form, chave: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" required />
                {activePosto !== "GLOBAL" && (
                  <p className="text-xs text-gray-500 mt-1">Sera salvo como: {activePosto}_{form.chave || "..."}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Valor {isSensitive(form.chave) && <span className="text-xs text-red-500">(sera criptografado)</span>}
                </label>
                <input
                  type={isSensitive(form.chave) && !showValue ? "password" : "text"}
                  value={form.valor}
                  onChange={(e) => setForm({ ...form, valor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descricao</label>
                <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white" />
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
