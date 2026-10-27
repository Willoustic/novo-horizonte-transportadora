"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { formatDateToDB } from "@/lib/date-utils"

interface Cotacao { id: string; posto_id: string; combustivel_id: string; fornecedor_id: string; preco: number; fonte: string; data_registro: string; base?: string; posto?: { nome: string; abreviacao: string }; combustivel?: { nome: string; abreviacao: string } }

export default function PrecosPage() {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [capturing, setCapturing] = useState(false)
  const [msg, setMsg] = useState("")
  const [tab, setTab] = useState<"vibra" | "geral">("vibra")
  const [showModal, setShowModal] = useState(false)
  const [selectedPosto, setSelectedPosto] = useState<string>("")

  async function fetchData() {
    setLoading(true)
    const dateStr = formatDateToDB(selectedDate)
    const res = await fetch(`/api/cotacoes?data=${dateStr}`)
    const json = await res.json()
    setCotacoes(Array.isArray(json) ? json : [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [selectedDate])

  async function handleCapture() {
    setCapturing(true)
    setMsg("Capturando precos da Vibra...")
    try {
      const res = await fetch("/api/vibra/capturar", { method: "POST" })
      const json = await res.json()
      if (res.ok) {
        setMsg(`Captura concluida: ${json.total ?? 0} precos.`)
        fetchData()
      } else {
        setMsg("Erro: " + (json.error || "desconhecido"))
      }
    } catch (e) {
      setMsg("Erro de rede")
    } finally {
      setCapturing(false)
    }
  }

  const vibraCotacoes = cotacoes.filter((c) => c.fonte === "vibra")
  const geralCotacoes = cotacoes.filter((c) => c.fonte !== "vibra")

  const byPosto = new Map<string, Cotacao[]>()
  for (const c of vibraCotacoes) {
    const key = c.posto?.abreviacao || c.posto_id
    if (!byPosto.has(key)) byPosto.set(key, [])
    byPosto.get(key)!.push(c)
  }

  const byBase = new Map<string, Cotacao[]>()
  for (const c of vibraCotacoes) {
    const key = c.base || "-"
    if (!byBase.has(key)) byBase.set(key, [])
    byBase.get(key)!.push(c)
  }
  const sortedBases = Array.from(byBase.entries()).sort((a, b) => {
    const pa = a[1][0]?.preco ?? 0
    const pb = b[1][0]?.preco ?? 0
    return pa - pb
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Precos</h1>
          <DatePicker date={selectedDate} onChange={setSelectedDate} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCapture}
            disabled={capturing}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600 transition-colors disabled:opacity-50"
          >
            {capturing ? "Capturando..." : "Capturar precos Vibra"}
          </button>
          <button
            onClick={() => setShowModal(true)}
            disabled={capturing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            Captura manual
          </button>
        </div>
      </div>
      {msg && <div className="text-sm text-gray-600">{msg}</div>}

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab("vibra")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "vibra" ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Precos Vibra
        </button>
        <button
          onClick={() => setTab("geral")}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === "geral" ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Geral
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Carregando...</div>
      ) : tab === "vibra" ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Por Posto</h2>
            {byPosto.size === 0 ? (
              <div className="text-gray-500 text-sm">Nenhum preco Vibra capturado.</div>
            ) : (
              Array.from(byPosto.entries()).map(([posto, items]) => (
                <div key={posto} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-4">
                  <div className="px-4 py-2 bg-green-50 border-b border-gray-200 font-medium text-green-800">{posto}</div>
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Preco Unit.</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Base</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {items.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{c.combustivel?.nome || "-"}</td>
                          <td className="px-4 py-2 text-sm text-right font-medium">R$ {c.preco?.toFixed(4)}</td>
                          <td className="px-4 py-2 text-sm">{c.base || "-"}</td>
                          <td className="px-4 py-2 text-sm">{new Date(c.data_registro).toLocaleString("pt-BR")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">Por Base (menor ao maior)</h2>
            {sortedBases.length === 0 ? (
              <div className="text-gray-500 text-sm">Nenhum preco por base.</div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preco Unit.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posto</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {sortedBases.map(([base, items]) =>
                      items.map((c) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium">{base}</td>
                          <td className="px-4 py-3 text-sm">{c.combustivel?.nome || "-"}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">R$ {c.preco?.toFixed(4)}</td>
                          <td className="px-4 py-3 text-sm">{c.posto?.abreviacao || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produto</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Preco Unit.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Base</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Hora da Captura</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {geralCotacoes.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Nenhum preco capturado para o dia {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}</td></tr>
              ) : (
                geralCotacoes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{c.combustivel?.nome || "-"}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">R$ {c.preco?.toFixed(4)}</td>
                    <td className="px-4 py-3 text-sm">{c.base || "-"}</td>
                    <td className="px-4 py-3 text-sm">{c.posto?.abreviacao || "-"}</td>
                    <td className="px-4 py-3 text-sm">{new Date(c.data_registro).toLocaleString("pt-BR")}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Captura manual por posto</h2>
            <select
              value={selectedPosto}
              onChange={(e) => setSelectedPosto(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4"
            >
              <option value="">Selecione o posto</option>
              <option value="PNH2-ZN">PNH2-ZN</option>
              <option value="PNH1-ZS">PNH1-ZS</option>
              <option value="VITORIA">VITORIA</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!selectedPosto) return
                  setShowModal(false)
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
                      setMsg(`Captura concluida: ${json.total ?? 0} precos.`)
                      fetchData()
                    } else {
                      setMsg("Erro: " + (json.error || "desconhecido"))
                    }
                  } catch {
                    setMsg("Erro de rede")
                  } finally {
                    setCapturing(false)
                  }
                }}
                disabled={!selectedPosto || capturing}
                className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {capturing ? "Capturando..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
