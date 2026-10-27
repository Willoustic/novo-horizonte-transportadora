"use client"

import React, { useState, useEffect } from "react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DatePicker } from "@/components/ui/date-picker"
import { createClient } from "@/lib/supabase/client"
import { formatDateToDB } from "@/lib/date-utils"
import { 
  Package, 
  Truck, 
  ClipboardList, 
  ArrowRightLeft, 
  DollarSign, 
  Settings, 
  LayoutDashboard 
} from "lucide-react"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [stats, setStats] = useState<{ [key: string]: number }>({
    pedidos: 0,
    carregamentos: 0,
    estoque: 0,
    emprestimos: 0,
    cotacoes: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchDailyStats() {
      setIsLoading(true)
      const dateStr = formatDateToDB(selectedDate)
      
      try {
        // Buscando contagens para cada módulo na data selecionada
        const start = `${dateStr}T00:00:00.000Z`
const end = `${dateStr}T23:59:59.999Z`
const [resPedidos, resCarreg, resEstoque, resEmpres, resCotacoes] = await Promise.all([
          supabase.from('pedidos').select('id', { count: 'exact', head: true }).eq('data', dateStr),
          supabase.from('carregamentos').select('id', { count: 'exact', head: true }).gte('created_at', start).lte('created_at', end),
          supabase.from('movimentacoes_estoque').select('id', { count: 'exact', head: true }).gte('data', start).lte('data', end),
          supabase.from('emprestimos').select('id', { count: 'exact', head: true }).eq('data_emprestimo', dateStr),
          supabase.from('cotacoes').select('id', { count: 'exact', head: true }).gte('data_registro', start).lte('data_registro', end),
        ])

        setStats({
          pedidos: resPedidos.count || 0,
          carregamentos: resCarreg.count || 0,
          estoque: resEstoque.count || 0,
          emprestimos: resEmpres.count || 0,
          cotacoes: resCotacoes.count || 0,
        })
      } catch (error) {
        console.error("Erro ao carregar stats:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchDailyStats()
  }, [selectedDate, supabase])

  const totalLancamentos = Object.values(stats).reduce((a, b) => a + b, 0)

  const cards = [
    { titulo: "Pedidos", value: stats.pedidos, href: "/pedidos", icon: ClipboardList, cor: "text-blue-600", bg: "bg-blue-50" },
    { titulo: "Carregamentos", value: stats.carregamentos, href: "/carregamentos", icon: Truck, cor: "text-orange-600", bg: "bg-orange-50" },
    { titulo: "Estoque", value: stats.estoque, href: "/estoque", icon: Package, cor: "text-green-600", bg: "bg-green-50" },
    { titulo: "Empréstimos", value: stats.emprestimos, href: "/emprestimos", icon: ArrowRightLeft, cor: "text-purple-600", bg: "bg-purple-50" },
    { titulo: "Cotações", value: stats.cotacoes, href: "/cotacoes", icon: DollarSign, cor: "text-yellow-600", bg: "bg-yellow-50" },
    { titulo: "Cadastros", value: null, href: "/cadastros", icon: LayoutDashboard, cor: "text-gray-600", bg: "bg-gray-50" },
    { titulo: "Parâmetros", value: null, href: "/parametros", icon: Settings, cor: "text-red-600", bg: "bg-red-50" },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Visão operacional diária</p>
        </div>
        
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
          <span className="text-sm font-medium text-gray-600 px-2">Data:</span>
          <DatePicker 
            date={selectedDate} 
            onChange={setSelectedDate} 
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl border border-gray-200" />
          ))}
        </div>
      ) : totalLancamentos === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center">
          <div className="bg-gray-50 p-4 rounded-full mb-4">
            <ClipboardList className="h-12 w-12 text-gray-300" />
          </div>
          <h3 className="text-xl font-semibold text-gray-700">Nenhum lançamento encontrado</h3>
          <p className="text-gray-500 max-w-sm">
            Não há pedidos, carregamentos ou movimentações registradas para o dia {format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <a
              key={card.href}
              href={card.href}
              className="group relative p-6 bg-white rounded-2xl shadow-sm border border-gray-200 hover:border-green-500 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className={cn("p-3 rounded-xl", card.bg, card.cor)}>
                  <card.icon className="h-6 w-6" />
                </div>
                {card.value !== null && (
                  <span className="text-2xl font-bold text-gray-900">{card.value}</span>
                )}
              </div>
              
              <div className="mt-4">
                <h2 className="text-lg font-semibold text-gray-800 group-hover:text-green-600 transition-colors">
                  {card.titulo}
                </h2>
                <p className="text-sm text-gray-500">
                  {card.value !== null 
                    ? `Lançamentos para hoje` 
                    : "Acesse a gestão de módulo"}
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
