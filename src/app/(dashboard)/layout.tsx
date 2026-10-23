import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-4">
        <h2 className="text-lg font-bold text-green-600 mb-6">
          Novo Horizonte
        </h2>
        <nav className="space-y-1">
          <a href="/" className="block px-3 py-2 rounded-lg text-sm hover:bg-green-50 text-gray-700">Dashboard</a>
          <a href="/pedidos" className="block px-3 py-2 rounded-lg text-sm hover:bg-green-50 text-gray-700">Pedidos</a>
          <a href="/carregamentos" className="block px-3 py-2 rounded-lg text-sm hover:bg-green-50 text-gray-700">Carregamentos</a>
          <a href="/estoque" className="block px-3 py-2 rounded-lg text-sm hover:bg-green-50 text-gray-700">Estoque</a>
          <a href="/emprestimos" className="block px-3 py-2 rounded-lg text-sm hover:bg-green-50 text-gray-700">Emprestimos</a>
          <a href="/cotacoes" className="block px-3 py-2 rounded-lg text-sm hover:bg-green-50 text-gray-700">Cotacoes</a>
          <a href="/cadastros" className="block px-3 py-2 rounded-lg text-sm hover:bg-green-50 text-gray-700">Cadastros</a>
          <a href="/parametros" className="block px-3 py-2 rounded-lg text-sm hover:bg-green-50 text-gray-700">Parametros</a>
        </nav>
      </aside>
      <main className="ml-64 p-6">{children}</main>
    </div>
  )
}