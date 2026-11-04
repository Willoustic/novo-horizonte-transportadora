"use client";

import { useState, useEffect } from "react";
import { CadastroTable } from "@/components/cadastros/CadastroTable";

interface TanquePosto {
  id: string;
  posto_id: string;
  numero: number;
  combustivel_id: string;
  capacidade_litros: number;
  estoque_minimo: number;
  ativo: boolean;
  posto?: { nome: string; abreviacao: string };
  combustivel?: { nome: string; abreviacao: string };
}

interface Posto {
  id: string;
  nome: string;
  abreviacao: string;
}

interface Combustivel {
  id: string;
  nome: string;
  abreviacao: string;
}

export default function TanquesPostoPage() {
  const [data, setData] = useState<TanquePosto[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [combustiveis, setCombustiveis] = useState<Combustivel[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TanquePosto | null>(null);
  const [form, setForm] = useState({
    posto_id: "",
    numero: 0,
    combustivel_id: "",
    capacidade_litros: 0,
    estoque_minimo: 0,
  });

  async function fetchData() {
    setLoading(true);
    const [tanquesRes, postosRes, combustiveisRes] = await Promise.all([
      fetch("/api/cadastros/tanques-posto"),
      fetch("/api/cadastros/postos"),
      fetch("/api/cadastros/combustiveis"),
    ]);
    setData(await tanquesRes.json());
    setPostos(await postosRes.json());
    setCombustiveis(await combustiveisRes.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const method = editing ? "PUT" : "POST";
    const url = editing
      ? `/api/cadastros/tanques-posto/${editing.id}`
      : "/api/cadastros/tanques-posto";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setModalOpen(false);
    setEditing(null);
    setForm({
      posto_id: "",
      numero: 0,
      combustivel_id: "",
      capacidade_litros: 0,
      estoque_minimo: 0,
    });
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja desativar este tanque?")) return;
    await fetch(`/api/cadastros/tanques-posto/${id}`, { method: "DELETE" });
    fetchData();
  }

  function handleEdit(row: TanquePosto) {
    setEditing(row);
    setForm({
      posto_id: row.posto_id,
      numero: row.numero,
      combustivel_id: row.combustivel_id,
      capacidade_litros: row.capacidade_litros,
      estoque_minimo: row.estoque_minimo,
    });
    setModalOpen(true);
  }

  return (
    <div>
      <CadastroTable
        title="Tanques de Posto"
        columns={[
          { key: "posto", label: "Posto", render: (v) => v?.abreviacao || "-" },
          { key: "numero", label: "Tanque #" },
          {
            key: "combustivel",
            label: "Combustivel",
            render: (v) => v?.abreviacao || "-",
          },
          { key: "capacidade_litros", label: "Capacidade (L)" },
          { key: "estoque_minimo", label: "Estoque Min (L)" },
          { key: "ativo", label: "Ativo", render: (v) => (v ? "Sim" : "Nao") },
        ]}
        data={data}
        loading={loading}
        onNew={() => {
          setEditing(null);
          setForm({
            posto_id: "",
            numero: 0,
            combustivel_id: "",
            capacidade_litros: 0,
            estoque_minimo: 0,
          });
          setModalOpen(true);
        }}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-bold mb-4">
              {editing ? "Editar Tanque de Posto" : "Novo Tanque de Posto"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Posto
                </label>
                <select
                  value={form.posto_id}
                  onChange={(e) =>
                    setForm({ ...form, posto_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Selecione...</option>
                  {postos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.abreviacao} - {p.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Numero do Tanque
                </label>
                <input
                  type="number"
                  value={form.numero}
                  onChange={(e) =>
                    setForm({ ...form, numero: parseInt(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Combustivel
                </label>
                <select
                  value={form.combustivel_id}
                  onChange={(e) =>
                    setForm({ ...form, combustivel_id: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">Selecione...</option>
                  {combustiveis.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.abreviacao} - {c.nome}
                    </option>
                  ))}
                </select>
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Estoque Minimo (litros)
                </label>
                <input
                  type="number"
                  value={form.estoque_minimo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      estoque_minimo: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
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
