"use client";

import { useState, useEffect } from "react";
import { CadastroTable } from "@/components/cadastros/CadastroTable";

interface TanqueCarreta {
  id: string;
  identificacao: string;
  capacidade_litros: number;
  ativo: boolean;
}

export default function TanquesCarretaPage() {
  const [data, setData] = useState<TanqueCarreta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TanqueCarreta | null>(null);
  const [form, setForm] = useState({ identificacao: "", capacidade_litros: 0 });

  async function fetchData() {
    setLoading(true);
    const res = await fetch("/api/cadastros/tanques-carreta");
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
      ? `/api/cadastros/tanques-carreta/${editing.id}`
      : "/api/cadastros/tanques-carreta";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setModalOpen(false);
    setEditing(null);
    setForm({ identificacao: "", capacidade_litros: 0 });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja desativar este tanque?")) return;
    await fetch(`/api/cadastros/tanques-carreta/${id}`, { method: "DELETE" });
    fetchData();
  }

  function handleEdit(row: TanqueCarreta) {
    setEditing(row);
    setForm({
      identificacao: row.identificacao,
      capacidade_litros: row.capacidade_litros,
    });
    setModalOpen(true);
  }

  return (
    <div>
      <CadastroTable
        title="Tanques de Carreta"
        columns={[
          { key: "identificacao", label: "Identificacao" },
          { key: "capacidade_litros", label: "Capacidade (L)" },
          { key: "ativo", label: "Ativo", render: (v) => (v ? "Sim" : "Nao") },
        ]}
        data={data}
        loading={loading}
        onNew={() => {
          setEditing(null);
          setForm({ identificacao: "", capacidade_litros: 0 });
          setModalOpen(true);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {editing ? "Editar Tanque" : "Novo Tanque de Carreta"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Identificacao
                </label>
                <input
                  value={form.identificacao}
                  onChange={(e) =>
                    setForm({ ...form, identificacao: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Capacidade (litros)
                </label>
                <input
                  type="number"
                  value={form.capacidade_litros}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      capacidade_litros: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  required
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
