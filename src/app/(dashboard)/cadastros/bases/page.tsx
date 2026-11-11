"use client";

import { useState, useEffect } from "react";
import { CadastroTable } from "@/components/cadastros/CadastroTable";

interface Base {
  id: string;
  nome: string;
  abreviacao: string;
  uf: string | null;
  cidade: string | null;
  fornecedor_id: string | null;
  fornecedor?: { nome: string | null } | null;
  ativo: boolean;
}

interface Fornecedor {
  id: string;
  nome: string;
}

export default function BasesPage() {
  const [data, setData] = useState<Base[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Base | null>(null);
  const [form, setForm] = useState({
    nome: "",
    abreviacao: "",
    uf: "",
    cidade: "",
    fornecedor_id: "",
  });

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/cadastros/bases");
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  async function fetchFornecedores() {
    const res = await fetch("/api/cadastros/fornecedores");
    const json = await res.json();
    setFornecedores(json);
  }

  useEffect(() => {
    fetchData();
    fetchFornecedores();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const url = editing
      ? `/api/cadastros/bases/${editing.id}`
      : "/api/cadastros/bases";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        fornecedor_id: form.fornecedor_id || null,
      }),
    });
    setModalOpen(false);
    setEditing(null);
    setForm({ nome: "", abreviacao: "", uf: "", cidade: "", fornecedor_id: "" });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja excluir esta base?")) return;
    await fetch(`/api/cadastros/bases/${id}`, { method: "DELETE" });
    fetchData();
  }

  function handleEdit(row: Base) {
    setEditing(row);
    setForm({
      nome: row.nome,
      abreviacao: row.abreviacao,
      uf: row.uf || "",
      cidade: row.cidade || "",
      fornecedor_id: row.fornecedor_id || "",
    });
    setModalOpen(true);
  }

  return (
    <div>
      <CadastroTable
        title="Bases"
        columns={[
          { key: "nome", label: "Nome" },
          { key: "abreviacao", label: "Abreviacao" },
          { key: "uf", label: "UF" },
          { key: "cidade", label: "Cidade" },
          { key: "fornecedor", label: "Fornecedor", render: (v) => v?.nome ?? "-" },
          { key: "ativo", label: "Ativo", render: (v) => (v ? "Sim" : "Nao") },
        ]}
        data={data}
        loading={loading}
        onNew={() => {
          setEditing(null);
          setForm({ nome: "", abreviacao: "", uf: "", cidade: "", fornecedor_id: "" });
          setModalOpen(true);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {editing ? "Editar Base" : "Nova Base"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Nome
                </label>
                <input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Abreviacao
                </label>
                <input
                  value={form.abreviacao}
                  onChange={(e) =>
                    setForm({ ...form, abreviacao: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  UF
                </label>
                <input
                  value={form.uf}
                  onChange={(e) =>
                    setForm({ ...form, uf: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                  maxLength={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Cidade
                </label>
                <input
                  value={form.cidade}
                  onChange={(e) =>
                    setForm({ ...form, cidade: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Fornecedor
                </label>
                <select
                  value={form.fornecedor_id}
                  onChange={(e) =>
                    setForm({ ...form, fornecedor_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                >
                  <option value="">Selecione um fornecedor</option>
                  {fornecedores.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
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
