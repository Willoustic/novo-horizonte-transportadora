"use client";

import { useState, useEffect } from "react";
import { CadastroTable } from "@/components/cadastros/CadastroTable";

interface Fornecedor {
  id: string;
  nome: string;
  telefone: string | null;
  tipo: string;
  ativo: boolean;
}

export default function FornecedoresPage() {
  const [data, setData] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Fornecedor | null>(null);
  const [form, setForm] = useState({ nome: "", telefone: "", tipo: "outro" });

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/cadastros/fornecedores");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const url = editing
      ? `/api/cadastros/fornecedores/${editing.id}`
      : "/api/cadastros/fornecedores";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setModalOpen(false);
    setEditing(null);
    setForm({ nome: "", telefone: "", tipo: "outro" });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja desativar este fornecedor?")) return;
    await fetch(`/api/cadastros/fornecedores/${id}`, { method: "DELETE" });
    fetchData();
  }

  function handleEdit(row: Fornecedor) {
    setEditing(row);
    setForm({ nome: row.nome, telefone: row.telefone || "", tipo: row.tipo });
    setModalOpen(true);
  }

  return (
    <div>
      <CadastroTable
        title="Fornecedores"
        columns={[
          { key: "nome", label: "Nome" },
          { key: "telefone", label: "Telefone" },
          { key: "tipo", label: "Tipo" },
          { key: "ativo", label: "Ativo", render: (v) => (v ? "Sim" : "Nao") },
        ]}
        data={data}
        loading={loading}
        onNew={() => {
          setEditing(null);
          setForm({ nome: "", telefone: "", tipo: "outro" });
          setModalOpen(true);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {editing ? "Editar Fornecedor" : "Novo Fornecedor"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Nome
                </label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Telefone
                </label>
                <input
                  value={form.telefone}
                  onChange={(e) =>
                    setForm({ ...form, telefone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Tipo
                </label>
                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <option value="vibra">Vibra</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
