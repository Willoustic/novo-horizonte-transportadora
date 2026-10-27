"use client"

import React, { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Package, Truck, ClipboardList, DollarSign, Users, Settings, LayoutDashboard, Fuel } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface LitragemRow { posto: string; combustivel: string; total: number }
interface CarregRow { motorista: string; cavalo: string; tanque: string; total: number }
interface EstoqueRow { posto: string; combustivel: string; volume: number }
interface PrecoRow { posto: string; combustivel: string; preco: number }

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [litragem, setLitragem] = useState<LitragemRow[]>([])
  const [carreg, setCarreg] = useState<CarregRow[]>([])
  const [estoque, setEstoque] = useState<EstoqueRow[]>([])
  const [precos, setPrecos] = useState<PrecoRow[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        // 1. Litragem total de pedidos por posto x combustivel
        const { data: pedidos } = await supabase
          .from("pedidos")
          .select("id, posto_id, postos(nome, abreviacao), itens_pedido(volume_solicitado, combustivel_id, combustiveis(nome, abreviacao))")
        const litMap: Record<string, number> = {}
        ;(pedidos || []).forEach((p: any) => {
          const posto = p.postos?.abreviacao || p.postos?.nome || "?"
          ;(p.itens_pedido || []).forEach((it: any) => {
            const comb = it.combustiveis?.abreviacao || it.combustiveis?.nome || "?"
            const key = `${posto}|${comb}`
            litMap[key] = (litMap[key] || 0) + Number(it.volume_solicitado || 0)
          })
        })
        setLitragem(Object.entries(litMap).map(([k, v]) => {
          const [posto, combustivel] = k.split("|")
          return { posto, combustivel, total: v }
        }))

        // 2. Carregamento por motorista
        const { data: carregamentos } = await supabase
          .from("carregamentos")
          .select("volume, motoristas(nome), cavalos(placa), tanques_carreta(identificacao)")
        const carMap: Record<string, { motorista: string; cavalo: string; tanque: string; total: number }> = {}
        ;(carregamentos || []).forEach((c: any) => {
          const m = c.motoristas?.nome || "?"
          const key = m
          if (!carMap[key]) carMap[key] = { motorista: m, cavalo: c.cavalos?.placa || "-", tanque: c.tanques_carreta?.identificacao || "-", total: 0 }
          carMap[key].total += Number(c.volume || 0)
        })
        setCarreg(Object.values(carMap))

        // 3. Estoque por empresa (filial)
        const { data: snaps } = await supabase
          .from("estoque_snapshots")
          .select("volume, tanques_posto(combustivel_id, postos(nome, abreviacao, tipo), combustiveis(abreviacao, nome))")
        const estMap: Record<string, number> = {}
        ;(snaps || []).forEach((s: any) => {
          const tp = s.tanques_posto
          if (tp?.postos?.tipo !== "FILIAL") return
          const posto = tp.postos?.abreviacao || tp.postos?.nome || "?"
          const comb = tp.combustiveis?.abreviacao || tp.combustiveis?.nome || "?"
          const key = `${posto}|${comb}`
          estMap[key] = (estMap[key] || 0) + Number(s.volume || 0)
        })
        setEstoque(Object.entries(estMap).map(([k, v]) => {
          const [posto, combustivel] = k.split("|")
          return { posto, combustivel, volume: v }
        }))

        // 4. Melhor preco por posto x produto (min)
        const { data: cotacoes } = await supabase
          .from("cotacoes")
          .select("preco, postos(abreviacao, nome), combustiveis(abreviacao, nome)")
        const precoMap: Record<string, number> = {}
        ;(cotacoes || []).forEach((c: any) => {
          const posto = c.postos?.abreviacao || c.postos?.nome || "?"
          const comb = c.combustiveis?.abreviacao || c.combustiveis?.nome || "?"
          const key = `${posto}|${comb}`
          const p = Number(c.preco || 0)
          if (!(key in precoMap) || p < precoMap[key]) precoMap[key] = p
        })
        setPrecos(Object.entries(precoMap).map(([k, v]) => {
          const [posto, combustivel] = k.split("|")
          return { posto, combustivel, preco: v }
        }))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [supabase])

  const shortcuts = [
    { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
    { href: "/carregamentos", label: "Carregamentos", icon: Truck },
    { href: "/estoque", label: "Estoque", icon: Package },
    { href: "/cotacoes", label: "Cotacoes", icon: DollarSign },
    { href: "/cadastros", label: "Cadastros", icon: Users },
    { href: "/parametros", label: "Parametros", icon: Settings },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Visao operacional</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Litragem de pedidos por posto x combustivel */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Fuel className="h-5 w-5 text-blue-600" />
              <h2 className="font-semibold text-gray-800 dark:text-white">Litragem de Pedidos por Posto</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 dark:text-gray-400">
                  <tr><th className="text-left py-1">Posto</th><th className="text-left py-1">Combustivel</th><th className="text-right py-1">Litros</th></tr>
                </thead>
                <tbody>
                  {litragem.length === 0 ? <tr><td colSpan={3} className="text-gray-400 py-2">Sem dados</td></tr> :
                    litragem.map((r, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-1 text-gray-700 dark:text-gray-200">{r.posto}</td>
                        <td className="py-1 text-gray-700 dark:text-gray-200">{r.combustivel}</td>
                        <td className="py-1 text-right font-mono text-gray-700 dark:text-gray-200">{r.total.toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 2: Carregamento por motorista */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Truck className="h-5 w-5 text-orange-600" />
              <h2 className="font-semibold text-gray-800 dark:text-white">Carregamento por Motorista</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 dark:text-gray-400">
                  <tr><th className="text-left py-1">Motorista</th><th className="text-left py-1">Cavalo</th><th className="text-left py-1">Tanque</th><th className="text-right py-1">Litros</th></tr>
                </thead>
                <tbody>
                  {carreg.length === 0 ? <tr><td colSpan={4} className="text-gray-400 py-2">Sem dados</td></tr> :
                    carreg.map((r, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-1 text-gray-700 dark:text-gray-200">{r.motorista}</td>
                        <td className="py-1 text-gray-700 dark:text-gray-200">{r.cavalo}</td>
                        <td className="py-1 text-gray-700 dark:text-gray-200">{r.tanque}</td>
                        <td className="py-1 text-right font-mono text-gray-700 dark:text-gray-200">{r.total.toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 3: Estoque por filial */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-green-600" />
              <h2 className="font-semibold text-gray-800 dark:text-white">Estoque por Filial</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 dark:text-gray-400">
                  <tr><th className="text-left py-1">Posto</th><th className="text-left py-1">Combustivel</th><th className="text-right py-1">Volume</th></tr>
                </thead>
                <tbody>
                  {estoque.length === 0 ? <tr><td colSpan={3} className="text-gray-400 py-2">Sem dados</td></tr> :
                    estoque.map((r, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-1 text-gray-700 dark:text-gray-200">{r.posto}</td>
                        <td className="py-1 text-gray-700 dark:text-gray-200">{r.combustivel}</td>
                        <td className="py-1 text-right font-mono text-gray-700 dark:text-gray-200">{r.volume.toLocaleString("pt-BR")}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card 4: Melhor preco por posto x produto */}
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-5 w-5 text-yellow-600" />
              <h2 className="font-semibold text-gray-800 dark:text-white">Melhor Preco por Posto</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-gray-500 dark:text-gray-400">
                  <tr><th className="text-left py-1">Posto</th><th className="text-left py-1">Combustivel</th><th className="text-right py-1">Preco</th></tr>
                </thead>
                <tbody>
                  {precos.length === 0 ? <tr><td colSpan={3} className="text-gray-400 py-2">Sem dados</td></tr> :
                    precos.map((r, i) => (
                      <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="py-1 text-gray-700 dark:text-gray-200">{r.posto}</td>
                        <td className="py-1 text-gray-700 dark:text-gray-200">{r.combustivel}</td>
                        <td className="py-1 text-right font-mono text-gray-700 dark:text-gray-200">{r.preco.toFixed(4)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {shortcuts.map((s) => (
          <Link key={s.href} href={s.href} className="flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-500 transition-colors">
            <s.icon className="h-5 w-5 text-green-600" />
            <span className="text-xs font-medium text-gray-700 dark:text-gray-200">{s.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
