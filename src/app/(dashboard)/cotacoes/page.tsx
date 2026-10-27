"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { formatDateToDB } from "@/lib/date-utils"
import { Trash2 } from "lucide-react"

interface Posto { id: string; nome: string; abreviacao: string }
interface Combustivel { id: string; nome: string; abreviacao: string }
interface Fornecedor { id: string; nome: string }
interface Cotacao { id: string; posto_id: string; combustivel_id: string; fornecedor_id: string; preco: number; fonte: string; data_registro: string; posto?: { nome: string; abreviacao: string }; combustivel?: { nome: string; abreviacao: string }; fornecedor?: { nome: string } }

const FONTES: Record<string, string> = { vibra: "Vibra", whatsapp: "WhatsApp", manual: "Manual" }

export default function CotacoesPage() {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [postos, setPostos] = useState<Posto[]>([])
  const [combustiveis, setCombustiveis] = useState<Combustivel[]>([])
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [vibraModalOpen, setVibraModalOpen] = useState(false)
  const [selectedPosto, setSelectedPosto] = useState<string>("")
  const [capturing, setCapturing] = useState(false)
  const [msg, setMsg] = useState("")
  const [form, setForm] = useState({ posto_id: "", combustivel_id: "", fornecedor_id: "", preco: 0, fonte: "manual", data: new Date() })

  async function fetchData() {
    setLoading(true)
    const dateStr = formatDateToDB(selectedDate)
    const [cotRes, postosRes, combRes, fornRes] = await Promise.all([
      fetch(`/api/cotacoes?data=${dateStr}`),
      fetch("/api/cadastros/postos"),
      fetch("/api/cadastros/combustiveis"),
      fetch("/api/cadastros/fornecedores"),
    ])
    const responses = [cotRes, postosRes, combRes, fornRes]
    for (const res of responses) {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert("Erro ao carregar dados: " + (err?.error || "erro desconhecido"))
        setLoading(false)
        return
      }
    }
    const cotJson = await cotRes.json().catch(() => null)
    const postosJson = await postosRes.json().catch(() => null)
    const combJson = await combRes.json().catch(() => null)
    const fornJson = await fornRes.json().catch(() => null)
    setCotacoes(Array.isArray(cotJson) ? cotJson : [])
    setPostos(Array.isArray(postosJson) ? postosJson : [])
    setCombustiveis(Array.isArray(combJson) ? combJson : [])
    setFornecedores(Array.isArray(fornJson) ? fornJson : [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [selectedDate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch("/api/cotacoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, data_registro: formatDateToDB(form.data) }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert("Erro ao salvar cotação: " + (err.error || "erro desconhecido"))
      return
    }
    setModalOpen(false)
    setForm({ posto_id: "", combustivel_id: "", fornecedor_id: "", preco: 0, fonte: "manual", data: new Date() })
    fetchData()
  }

  async function handleVibraCapture() {
    if (!selectedPosto) return
    setCapturing(true)
    setMsg(`Capturando posto ${selectedPosto}...`)
    try {
      const res = await fetch("/api/vibra/capturar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posto: selectedPosto }),
      })
      const json = await res.json()
      if (res.ok) {
        setMsg(`Captura concluida.`)
        fetchData()
      } else {
        setMsg("Erro: " + (json.error || "desconhecido"))
      }
    } catch {
      setMsg("Erro de rede")
    } finally {
      setCapturing(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Deseja realmente excluir esta cotação?")) return
    const res = await fetch(`/api/cotacoes/${id}`, { method: "DELETE" })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert("Erro ao excluir cotação: " + (err.error || "erro desconhecido"))
      return
    }
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Cotações</h1>
          <DatePicker date={selectedDate} onChange={setSelectedDate} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setForm({ posto_id: "", combustivel_id: "", fornecedor_id: "", preco: 0, fonte: "manual", data: new Date() }); setModalOpen(true) }} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors">
            + Nova Cotação
          </button>
          <button onClick={() => setVibraModalOpen(true)} disabled={capturing} className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50">
            {capturing ? "Capturando..." : "Capturar Vibra"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Combustível</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fornecedor</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preço</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fonte</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {cotacoes.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Não há cotações para o dia {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</td></tr>
              ) : (
                cotacoes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{c.posto?.abreviacao || "-"}</td>
                    <td className="px-4 py-3 text-sm">{c.combustivel?.abreviacao || "-"}</td>
                    <td className="px-4 py-3 text-sm">{c.fornecedor?.nome || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">R$ {c.preco?.toFixed(4)}</td>
                    <td className="px-4 py-3 text-sm">{FONTES[c.fonte] || c.fonte}</td>
                    <td className="px-4 py-3 text-sm">{new Date(c.data_registro).toLocaleDateString("pt-BR")}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(c.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Excluir cotação">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {msg && <div className="text-sm text-gray-600">{msg}</div>}

      {vibraModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Captura manual Vibra</h2>
              <button onClick={() => setVibraModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <select value={selectedPosto} onChange={(e) => setSelectedPosto(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4">
              <option value="">Selecione o posto</option>
              <option value="PNH2-ZN">PNH2-ZN</option>
              <option value="PNH1-ZS">PNH1-ZS</option>
              <option value="VITORIA">VITORIA</option>
            </select>
            <div className="flex justify-end space-x-2">
              <button type="button" onClick={() => setVibraModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
              <button type="button" onClick={() => { setVibraModalOpen(false); handleVibraCapture() }} disabled={!selectedPosto || capturing} className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50">
                {capturing ? "Capturando..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Nova Cotação</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Posto</label>
                  <select value={form.posto_id} onChange={(e) => setForm({ ...form, posto_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {postos.map((p) => (<option key={p.id} value={p.id}>{p.abreviacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Combustível</label>
                  <select value={form.combustivel_id} onChange={(e) => setForm({ ...form, combustivel_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {combustiveis.map((c) => (<option key={c.id} value={c.id}>{c.abreviacao}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fornecedor</label>
                  <select value={form.fornecedor_id} onChange={(e) => setForm({ ...form, fornecedor_id: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required>
                    <option value="">Selecione...</option>
                    {fornecedores.map((f) => (<option key={f.id} value={f.id}>{f.nome}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preço</label>
                  <input type="number" step="0.0001" value={form.preco} onChange={(e) => setForm({ ...form, preco: parseFloat(e.target.value) })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fonte</label>
                  <select value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg">
                    <option value="manual">Manual</option>
                    <option value="vibra">Vibra</option>
                    <option value="whatsapp">WhatsApp</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                  <DatePicker date={form.data} onChange={(d) => setForm({ ...form, data: d })} />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Salvar Cotação</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}