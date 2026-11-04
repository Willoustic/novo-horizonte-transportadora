"use client";

import { useState, useEffect } from "react";
import { CadastroTable } from "@/components/cadastros/CadastroTable";

interface Posto {
  id: string;
  nome: string;
  abreviacao: string;
  tipo: string;
  regiao: string | null;
  ativo: boolean;
}

export default function PostosPage() {
  const [data, setData] = useState<Posto[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Posto | null>(null);
  const [form, setForm] = useState({
    nome: "",
    abreviacao: "",
    tipo: "FILIAL",
    regiao: "",
  });

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/cadastros/postos");
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
      ? `/api/cadastros/postos/${editing.id}`
      : "/api/cadastros/postos";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setModalOpen(false);
    setEditing(null);
    setForm({ nome: "", abreviacao: "", tipo: "FILIAL", regiao: "" });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja desativar este posto?")) return;
    await fetch(`/api/cadastros/postos/${id}`, { method: "DELETE" });
    fetchData();
  }

  function handleEdit(row: Posto) {
    setEditing(row);
    setForm({
      nome: row.nome,
      abreviacao: row.abreviacao,
      tipo: row.tipo,
      regiao: row.regiao || "",
    });
    setModalOpen(true);
  }

  return (
    <div>
      <CadastroTable
        title="Postos"
        columns={[
          { key: "nome", label: "Nome" },
          { key: "abreviacao", label: "Abreviacao" },
          { key: "tipo", label: "Tipo" },
          { key: "regiao", label: "Regiao" },
          { key: "ativo", label: "Ativo", render: (v) => (v ? "Sim" : "Nao") },
        ]}
        data={data}
        loading={loading}
        onNew={() => {
          setEditing(null);
          setForm({ nome: "", abreviacao: "", tipo: "FILIAL", regiao: "" });
          setModalOpen(true);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {editing ? "Editar Posto" : "Novo Posto"}
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
                  Abreviacao
                </label>
                <input
                  value={form.abreviacao}
                  onChange={(e) =>
                    setForm({ ...form, abreviacao: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  required
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
                  <option value="FILIAL">Filial</option>
                  <option value="CLIENTE">Cliente</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Regiao
                </label>
                <input
                  value={form.regiao}
                  onChange={(e) => setForm({ ...form, regiao: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                />
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
