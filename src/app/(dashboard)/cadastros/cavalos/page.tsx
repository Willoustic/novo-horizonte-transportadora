"use client"

import { useState, useEffect } from "react"
import { CadastroTable } from "@/components/cadastros/CadastroTable"

interface Cavalo {
  id: string
  placa: string
  modelo: string | null
  ano: number | null
  ativo: boolean
}

export default function CavalosPage() {
  const [data, setData] = useState<Cavalo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Cavalo | null>(null)
  const [form, setForm] = useState({ placa: "", modelo: "", ano: 0 })

  async function fetchData() {
    setLoading(true)
    const res = await fetch("/api/cadastros/cavalos")
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = editing ? "PUT" : "POST"
    const url = editing ? `/api/cadastros/cavalos/${editing.id}` : "/api/cadastros/cavalos"
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setModalOpen(false)
    setEditing(null)
    setForm({ placa: "", modelo: "", ano: 0 })
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja desativar este cavalo?")) return
    await fetch(`/api/cadastros/cavalos/${id}`, { method: "DELETE" })
    fetchData()
  }

  function handleEdit(row: Cavalo) {
    setEditing(row)
    setForm({ placa: row.placa, modelo: row.modelo || "", ano: row.ano || 0 })
    setModalOpen(true)
  }

  return (
    <div>
      <CadastroTable
        title="Cavalos"
        columns={[
          { key: "placa", label: "Placa" },
          { key: "modelo", label: "Modelo" },
          { key: "ano", label: "Ano" },
          { key: "ativo", label: "Ativo", render: (v) => v ? "Sim" : "Nao" },
        ]}
        data={data}
        loading={loading}
        onNew={() => { setEditing(null); setForm({ placa: "", modelo: "", ano: 0 }); setModalOpen(true) }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">{editing ? "Editar Cavalo" : "Novo Cavalo"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Placa</label>
                <input value={form.placa} onChange={(e) => setForm({ ...form, placa: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Modelo</label>
                <input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Ano</label>
                <input type="number" value={form.ano} onChange={(e) => setForm({ ...form, ano: parseInt(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg" />
              </div>
              <div className="flex justify-end space-x-2">
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