"use client";

import { useState, useEffect } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DatePicker } from "@/components/ui/date-picker";
import { Trash2, Plus } from "lucide-react";
import { formatDateToDB, formatDateFromDB } from "@/lib/date-utils";

interface Carregamento {
  id: string;
  posto_destino_id: string;
  motorista_id: string;
  cavalo_id: string;
  tanque_carreta_id: string;
  volume: number;
  base_id: string | null;
  status: string;
  data: string;
  created_at: string;
  posto_destino?: { nome: string; abreviacao: string };
  motorista?: { nome: string };
  cavalo?: { placa: string };
  tanque_carreta?: { identificacao: string };
  base?: { nome: string; abreviacao: string };
}

const STATUS_LABELS: Record<string, string> = {
  carregando: "Carregando",
  em_transito: "Em Transito",
  entregue: "Entregue",
  devolvido: "Devolvido",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  carregando: "bg-yellow-100 text-yellow-800",
  em_transito: "bg-blue-100 text-blue-800",
  entregue: "bg-green-100 text-green-800",
  devolvido: "bg-orange-100 text-orange-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function CarregamentosPage() {
  const [carregamentos, setCarregamentos] = useState<Carregamento[]>([]);
  const [motoristas, setMotoristas] = useState<any[]>([]);
  const [cavalos, setCavalos] = useState<any[]>([]);
  const [tanquesCarreta, setTanquesCarreta] = useState<any[]>([]);
  const [postos, setPostos] = useState<any[]>([]);
  const [bases, setBases] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    posto_destino_id: "",
    motorista_id: "",
    cavalo_id: "",
    tanque_carreta_id: "",
    volume: 0,
    base_id: "",
    status: "carregando",
    data: new Date(),
  });

  async function fetchData() {
    try {
      setLoading(true);
      const dateStr = formatDateToDB(selectedDate);
      const [carregRes, motRes, cavRes, tanqRes, postosRes, basesRes] =
        await Promise.all([
          fetch(`/api/carregamentos?data=${dateStr}`),
          fetch("/api/cadastros/motoristas"),
          fetch("/api/cadastros/cavalos"),
          fetch("/api/cadastros/tanques-carreta"),
          fetch("/api/cadastros/postos"),
          fetch("/api/cadastros/bases"),
        ]);
      const carregData = await carregRes.json();
      const motData = await motRes.json();
      const cavData = await cavRes.json();
      const tanqData = await tanqRes.json();
      const postosData = await postosRes.json();
      const basesData = await basesRes.json();
      if (!carregRes.ok)
        alert(carregData?.error || "Erro ao carregar carregamentos");
      if (!motRes.ok) alert(motData?.error || "Erro ao carregar motoristas");
      if (!cavRes.ok) alert(cavData?.error || "Erro ao carregar cavalos");
      if (!tanqRes.ok) alert(tanqData?.error || "Erro ao carregar tanques");
      if (!postosRes.ok) alert(postosData?.error || "Erro ao carregar postos");
      setCarregamentos(Array.isArray(carregData) ? carregData : []);
      setMotoristas(Array.isArray(motData) ? motData : []);
      setCavalos(Array.isArray(cavData) ? cavData : []);
      setTanquesCarreta(Array.isArray(tanqData) ? tanqData : []);
      setPostos(Array.isArray(postosData) ? postosData : []);
      setBases(Array.isArray(basesData) ? basesData : []);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/carregamentos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        base_id: form.base_id || undefined,
        data: formatDateToDB(form.data),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(
        "Erro ao criar carregamento: " + (err.error || "erro desconhecido"),
      );
      return;
    }
    setModalOpen(false);
    setForm({
      posto_destino_id: "",
      motorista_id: "",
      cavalo_id: "",
      tanque_carreta_id: "",
      volume: 0,
      base_id: "",
      status: "carregando",
      data: new Date(),
    });
    await fetchData();
  }

  async function handleStatusChange(id: string, status: string) {
    const res = await fetch(`/api/carregamentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert("Erro ao atualizar status: " + (err.error || "erro desconhecido"));
      return;
    }
    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir este carregamento?")) return;
    const res = await fetch(`/api/carregamentos?id=${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(
        "Erro ao excluir carregamento: " + (err.error || "erro desconhecido"),
      );
      return;
    }
    await fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Carregamentos
          </h1>
          <DatePicker date={selectedDate} onChange={setSelectedDate} />
        </div>
        <button
          onClick={() => {
            setForm({
              posto_destino_id: "",
              motorista_id: "",
              cavalo_id: "",
              tanque_carreta_id: "",
              volume: 0,
              base_id: "",
              status: "carregando",
              data: new Date(),
            });
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" /> Novo Carregamento
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          Carregando...
        </div>
      ) : (
        <DataTable
          columns={
            [
              {
                accessorKey: "posto_destino",
                header: "Destino",
                cell: ({ row }: any) =>
                  row.original.posto_destino?.abreviacao ||
                  row.original.posto_destino_id,
                enableColumnFilter: true,
              },
              {
                accessorKey: "motorista",
                header: "Motorista",
                cell: ({ row }: any) => row.original.motorista?.nome || "-",
                enableColumnFilter: true,
              },
              {
                accessorKey: "cavalo",
                header: "Cavalo",
                cell: ({ row }: any) => row.original.cavalo?.placa || "-",
                enableColumnFilter: true,
              },
              {
                accessorKey: "tanque_carreta",
                header: "Tanque Carreta",
                cell: ({ row }: any) =>
                  row.original.tanque_carreta?.identificacao || "-",
                enableColumnFilter: true,
              },
              {
                accessorKey: "volume",
                header: "Volume (L)",
                cell: ({ row }: any) =>
                  row.original.volume?.toLocaleString("pt-BR"),
              },
              {
                accessorKey: "base",
                header: "Base Origem",
                cell: ({ row }: any) => row.original.base?.abreviacao || "-",
                enableColumnFilter: true,
              },
              {
                accessorKey: "status",
                header: "Status",
                cell: ({ row }: any) => (
                  <div className="flex items-center space-x-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[row.original.status] || "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100"}`}
                    >
                      {STATUS_LABELS[row.original.status] ||
                        row.original.status}
                    </span>
                    <select
                      value={row.original.status}
                      onChange={(e) =>
                        handleStatusChange(row.original.id, e.target.value)
                      }
                      className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1"
                    >
                      {Object.entries(STATUS_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                ),
                enableColumnFilter: true,
              },
              {
                accessorKey: "data",
                header: "Data",
                cell: ({ row }: any) => formatDateFromDB(row.original.data),
              },
              {
                id: "acoes",
                header: "Ações",
                cell: ({ row }: any) => (
                  <button
                    onClick={() => handleDelete(row.original.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ),
                enableSorting: false,
                enableColumnFilter: false,
              },
            ] as ColumnDef<any, any>[]
          }
          data={carregamentos}
          loading={loading}
          emptyMessage={`Nenhum carregamento para o dia ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`}
        />
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Novo Carregamento
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Posto Destino
                  </label>
                  <select
                    value={form.posto_destino_id}
                    onChange={(e) =>
                      setForm({ ...form, posto_destino_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    required
                  >
                    <option value="">Selecione...</option>
                    {postos.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.abreviacao}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Data do Carregamento
                  </label>
                  <DatePicker
                    date={form.data}
                    onChange={(d) => setForm({ ...form, data: d })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Motorista
                  </label>
                  <select
                    value={form.motorista_id}
                    onChange={(e) =>
                      setForm({ ...form, motorista_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    required
                  >
                    <option value="">Selecione...</option>
                    {motoristas.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Cavalo
                  </label>
                  <select
                    value={form.cavalo_id}
                    onChange={(e) =>
                      setForm({ ...form, cavalo_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    required
                  >
                    <option value="">Selecione...</option>
                    {cavalos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.placa}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Tanque Carreta
                  </label>
                  <select
                    value={form.tanque_carreta_id}
                    onChange={(e) =>
                      setForm({ ...form, tanque_carreta_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    required
                  >
                    <option value="">Selecione...</option>
                    {tanquesCarreta.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.identificacao}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Volume (L)
                  </label>
                  <input
                    type="number"
                    value={form.volume}
                    onChange={(e) =>
                      setForm({ ...form, volume: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Base Origem
                  </label>
                  <select
                    value={form.base_id}
                    onChange={(e) =>
                      setForm({ ...form, base_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    <option value="">Selecione...</option>
                    {bases.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.abreviacao} - {b.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4">
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
                  Criar Carregamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
