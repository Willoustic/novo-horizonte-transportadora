"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDateToDB, formatDateTimeBR } from "@/lib/date-utils";
import { Trash2 } from "lucide-react";
import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/shared/DataTable";

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
interface Fornecedor {
  id: string;
  nome: string;
}
interface Base {
  id: string;
  nome: string;
  abreviacao: string;
}
interface Cotacao {
  id: string;
  posto_id: string;
  combustivel_id: string;
  fornecedor_id: string;
  preco: number;
  fonte: string;
  base?: Base | null;
  data_registro: string;
  posto?: { nome: string; abreviacao: string };
  combustivel?: { nome: string; abreviacao: string };
  fornecedor?: { nome: string };
}

const FONTES: Record<string, string> = {
  vibra: "Vibra",
  whatsapp: "WhatsApp",
  manual: "Manual",
};

export default function CotacoesPage() {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [postos, setPostos] = useState<Posto[]>([]);
  const [combustiveis, setCombustiveis] = useState<Combustivel[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [bases, setBases] = useState<Base[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [vibraModalOpen, setVibraModalOpen] = useState(false);
  const [selectedPosto, setSelectedPosto] = useState<string>("");
  const [capturing, setCapturing] = useState(false);
  const [msg, setMsg] = useState("");
  const [captureStatus, setCaptureStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [form, setForm] = useState({
    posto_id: "",
    combustivel_id: "",
    fornecedor_id: "",
    base_id: "",
    preco: 0,
    fonte: "manual",
    data: new Date(),
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const dateStr = formatDateToDB(selectedDate);
      const [cotRes, postosRes, combRes, fornRes, basesRes] = await Promise.all([
        fetch(`/api/cotacoes?data=${dateStr}`),
        fetch("/api/cadastros/postos"),
        fetch("/api/cadastros/combustiveis"),
        fetch("/api/cadastros/fornecedores"),
        fetch("/api/cadastros/bases"),
      ]);
      const responses = [cotRes, postosRes, combRes, fornRes, basesRes];
      for (const res of responses) {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert("Erro ao carregar dados: " + (err?.error || "erro desconhecido"));
          setLoading(false);
          return;
        }
      }
      const cotJson = await cotRes.json().catch(() => null);
      const postosJson = await postosRes.json().catch(() => null);
      const combJson = await combRes.json().catch(() => null);
      const fornJson = await fornRes.json().catch(() => null);
      const basesJson = await basesRes.json().catch(() => null);
      setCotacoes(Array.isArray(cotJson) ? cotJson : []);
      setPostos(Array.isArray(postosJson) ? postosJson : []);
      setCombustiveis(Array.isArray(combJson) ? combJson : []);
      setFornecedores(Array.isArray(fornJson) ? fornJson : []);
      setBases(Array.isArray(basesJson) ? basesJson : []);
    } catch (err) {
      alert("Erro inesperado ao carregar dados: " + (err instanceof Error ? err.message : "erro desconhecido"));
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/cotacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        data_registro: formatDateToDB(form.data),
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert("Erro ao salvar cotação: " + (err.error || "erro desconhecido"));
      return;
    }
    setModalOpen(false);
    setForm({
      posto_id: "",
      combustivel_id: "",
      fornecedor_id: "",
      base_id: "",
      preco: 0,
      fonte: "manual",
      data: new Date(),
    });
    await fetchData();
  }

  async function handleVibraCapture() {
    setCapturing(true);
    setCaptureStatus("idle");
    setMsg(
      selectedPosto && selectedPosto !== "ALL"
        ? `Capturando posto ${selectedPosto}...`
        : "Capturando todos os postos...",
    );
    try {
      const res = await fetch("/api/vibra/capturar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posto: selectedPosto,
          data: formatDateToDB(selectedDate),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setCaptureStatus("success");
        setMsg(
          "Captura agendada com sucesso. Os preços serão atualizados em alguns minutos.",
        );
        // Atualiza tabela imediatamente após captura ser agendada
        await fetchData();
      } else {
        setCaptureStatus("error");
        setMsg("Erro: " + (json.error || "desconhecido"));
      }
    } catch {
      setCaptureStatus("error");
      setMsg("Erro de rede");
    } finally {
      setCapturing(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir esta cotação?")) return;
    const res = await fetch(`/api/cotacoes/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert("Erro ao excluir cotação: " + (err.error || "erro desconhecido"));
      return;
    }
    await fetchData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Cotações
          </h1>
          <DatePicker date={selectedDate} onChange={setSelectedDate} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setForm({
                posto_id: "",
                combustivel_id: "",
                fornecedor_id: "",
                base_id: "",
                preco: 0,
                fonte: "manual",
                data: new Date(),
              });
              setModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            + Nova Cotação
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Atualizando..." : "Atualizar Preços"}
          </button>
          <button
            onClick={() => setVibraModalOpen(true)}
            disabled={capturing || loading}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            {capturing ? "Capturando..." : "Capturar Vibra"}
          </button>
        </div>
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
                id: "posto",
                accessorFn: (row: any) => row.original.posto?.abreviacao || "-",
                header: "Posto",
                cell: ({ row }: any) => row.original.posto?.abreviacao || "-",
                enableColumnFilter: true,
              },
              {
                id: "combustivel",
                accessorFn: (row: any) =>
                  row.original.combustivel?.abreviacao || "-",
                header: "Combustível",
                cell: ({ row }: any) =>
                  row.original.combustivel?.abreviacao || "-",
                enableColumnFilter: true,
              },
              {
                id: "fornecedor",
                accessorFn: (row: any) => row.original.fornecedor?.nome || "-",
                header: "Fornecedor",
                cell: ({ row }: any) => row.original.fornecedor?.nome || "-",
                enableColumnFilter: true,
              },
              {
                id: "base",
                accessorKey: "base",
                header: "Base",
                cell: ({ row }: any) => row.original.base?.abreviacao || "-",
                enableColumnFilter: true,
              },
              {
                id: "preco",
                accessorKey: "preco",
                header: "Preço",
                cell: ({ row }: any) => {
                  const preco = row.original.preco;
                  return preco == null || Number.isNaN(preco)
                    ? "R$ -"
                    : `R$ ${preco.toFixed(4)}`;
                },
              },
              {
                id: "fonte",
                accessorFn: (row: any) =>
                  FONTES[row.original.fonte] || row.original.fonte,
                header: "Fonte",
                cell: ({ row }: any) =>
                  FONTES[row.original.fonte] || row.original.fonte,
                enableColumnFilter: true,
              },
              {
                id: "data",
                accessorFn: (row: any) =>
                  formatDateTimeBR(row.original.data_registro),
                header: "Data",
                cell: ({ row }: any) =>
                  formatDateTimeBR(row.original.data_registro),
                enableColumnFilter: true,
              },
              {
                id: "acoes",
                header: "Ações",
                cell: ({ row }: any) => (
                  <button
                    onClick={() => handleDelete(row.original.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Excluir cotação"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                ),
                enableSorting: false,
                enableColumnFilter: false,
              },
            ] as ColumnDef<any, any>[]
          }
          data={cotacoes}
          loading={false}
          emptyMessage={`Não há cotações para o dia ${format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}`}
        />
      )}

      {msg && (
        <div className="text-sm text-gray-600 dark:text-gray-300">{msg}</div>
      )}

      {vibraModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Captura manual Vibra
              </h2>
              <button
                onClick={() => setVibraModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-300"
              >
                ✕
              </button>
            </div>
            <select
              value={selectedPosto}
              onChange={(e) => setSelectedPosto(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg mb-4"
            >
              <option value="">Selecione o posto</option>
              <option value="ALL">Todos</option>
              <option value="PNH2-ZN">PNH2-ZN</option>
              <option value="PNH1-ZS">PNH1-ZS</option>
              <option value="VITORIA">VITORIA</option>
            </select>
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setVibraModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:text-gray-100"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setVibraModalOpen(false);
                  handleVibraCapture();
                }}
                disabled={capturing}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50"
              >
                {capturing ? "Capturando..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: capturando */}
      {capturing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              Capturando Vibra...
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              {captureStatus === "idle"
                ? "Aguarde enquanto os preços são capturados."
                : ""}
            </p>
          </div>
        </div>
      )}

      {/* Modal: resultado da captura */}
      {(captureStatus === "success" || captureStatus === "error") && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 w-full max-w-sm shadow-2xl text-center">
            {captureStatus === "success" ? (
              <>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 text-2xl">✓</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Captura agendada
                </h3>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-600 text-2xl">✕</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                  Erro na captura
                </h3>
              </>
            )}
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
              {msg}
            </p>
            <button
              onClick={() => {
                setCaptureStatus("idle");
                fetchData();
              }}
              className={`px-6 py-2 rounded-lg font-medium ${captureStatus === "success" ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-600 text-white hover:bg-gray-700"}`}
            >
              {captureStatus === "success" ? "Atualizar agora" : "Fechar"}
            </button>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Nova Cotação
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
                    Posto
                  </label>
                  <select
                    value={form.posto_id}
                    onChange={(e) =>
                      setForm({ ...form, posto_id: e.target.value })
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
                    Combustível
                  </label>
                  <select
                    value={form.combustivel_id}
                    onChange={(e) =>
                      setForm({ ...form, combustivel_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    required
                  >
                    <option value="">Selecione...</option>
                    {combustiveis.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.abreviacao}
                      </option>
                    ))}
                  </select>
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
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    required
                  >
                    <option value="">Selecione...</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Base
                  </label>
                  <select
                    value={form.base_id}
                    onChange={(e) =>
                      setForm({ ...form, base_id: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    required
                  >
                    <option value="">Selecione...</option>
                    {bases.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.abreviacao}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Preço
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={form.preco}
                    onChange={(e) =>
                      setForm({ ...form, preco: parseFloat(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Fonte
                  </label>
                  <select
                    value={form.fonte}
                    onChange={(e) =>
                      setForm({ ...form, fonte: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  >
                    <option value="manual">Manual</option>
                    <option value="vibra">Vibra</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                    Data
                  </label>
                  <DatePicker
                    date={form.data}
                    onChange={(d) => setForm({ ...form, data: d })}
                  />
                </div>
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
                  Salvar Cotação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
