"use client"

import { useState, useEffect } from "react"
import { CadastroTable } from "@/components/cadastros/CadastroTable"

interface Motorista {
  id: string
  nome: string
  cnh: string | null
  categoria: string | null
  validade_cnh: string | null
  ativo: boolean
}

export default function MotoristasPage() {
  const [data, setData] = useState<Motorista[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Motorista | null>(null)
  const [form, setForm] = useState({ nome: "", cnh: "", categoria: "", validade_cnh: "" })

  async function fetchData() {
    setLoading(true)
    const res = await fetch("/api/cadastros/motoristas")
    const json = await res.json()
    setData(json)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const method = editing ? "PUT" : "POST"
    const url = editing ? `/api/cadastros/motoristas/${editing.id}` : "/api/cadastros/motoristas"
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    setModalOpen(false)
    setEditing(null)
    setForm({ nome: "", cnh: "", categoria: "", validade_cnh: "" })
    fetchData()
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja desativar este motorista?")) return
    await fetch(`/api/cadastros/motoristas/${id}`, { method: "DELETE" })
    fetchData()
  }

  function handleEdit(row: Motorista) {
    setEditing(row)
    setForm({ nome: row.nome, cnh: row.cnh || "", categoria: row.categoria || "", validade_cnh: row.validade_cnh || "" })
    setModalOpen(true)
  }

  return (
    <div>
      <CadastroTable
        title="Motoristas"
        columns={[
          { key: "nome", label: "Nome" },
          { key: "cnh", label: "CNH" },
          { key: "categoria", label: "Categoria" },
          { key: "validade_cnh", label: "Validade CNH" },
          { key: "ativo", label: "Ativo", render: (v) => v ? "Sim" : "Nao" },
        ]}
        data={data}
        loading={loading}
        onNew={() => { setEditing(null); setForm({ nome: "", cnh: "", categoria: "", validade_cnh: "" }); setModalOpen(true) }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">{editing ? "Editar Motorista" : "Novo Motorista"}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CNH</label>
                <input value={form.cnh} onChange={(e) => setForm({ ...form, cnh: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Validade CNH</label>
                <input type="date" value={form.validade_cnh} onChange={(e) => setForm({ ...form, validade_cnh: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
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