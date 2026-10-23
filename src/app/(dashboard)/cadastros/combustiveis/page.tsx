"use client"

import { useState, useEffect } from "react"
import { CadastroTable } from "@/components/cadastros/CadastroTable"

interface Combustivel {
  id: string
  nome: string
  abreviacao: string
  densidade: number
  ativo: boolean
}

export default function CombustiveisPage() {
  const [data, setData] = useState<Combustivel[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Combustivel | null>(null)
  const [form, setForm] = useState({ nome: "", abreviacao: "", densidade: 0 })

  async function fetchData() {
    setLoading(true)
    const res = await fetch("/api/cadastros/combustiveis")
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = editing ? "PUT" : "POST"
    const url = editing ? `/api/cadastros/combustiveis/${editing.id}` : "/api/cadastros/combustiveis"
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setModalOpen(false)
    setEditing(null)
    setForm({ nome: "", abreviacao: "", densidade: 0 })
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja desativar este combustivel?")) return
    await fetch(`/api/cadastros/combustiveis/${id}`, { method: "DELETE" })
    fetchData()
  }

  function handleEdit(row: Combustivel) {
    setEditing(row)
    setForm({ nome: row.nome, abreviacao: row.abreviacao, densidade: row.densidade })
    setModalOpen(true)
  }

  return (
    <div>
      <CadastroTable
        title="Combustiveis"
        columns={[
          { key: "nome", label: "Nome" },
          { key: "abreviacao", label: "Abreviacao" },
          { key: "densidade", label: "Densidade" },
          { key: "ativo", label: "Ativo", render: (v) => v ? "Sim" : "Nao" },
        ]}
        data={data}
        loading={loading}
        onNew={() => { setEditing(null); setForm({ nome: "", abreviacao: "", densidade: 0 }); setModalOpen(true) }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">{editing ? "Editar Combustivel" : "Novo Combustivel"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Abreviacao</label>
                <input value={form.abreviacao} onChange={(e) => setForm({ ...form, abreviacao: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Densidade</label>
                <input type="number" step="0.001" value={form.densidade} onChange={(e) => setForm({ ...form, densidade: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
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