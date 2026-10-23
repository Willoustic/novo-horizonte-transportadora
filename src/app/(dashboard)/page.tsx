export default function DashboardPage() {
  const cards = [
    { titulo: "Pedidos", href: "/pedidos", descricao: "Gerenciar pedidos de combustivel" },
    { titulo: "Carregamentos", href: "/carregamentos", descricao: "Acompanhar carregamentos" },
    { titulo: "Estoque", href: "/estoque", descricao: "Snapshots diarios e alertas" },
    { titulo: "Emprestimos", href: "/emprestimos", descricao: "Emprestimos entre postos" },
    { titulo: "Cotacoes", href: "/cotacoes", descricao: "Cotacoes de precos" },
    { titulo: "Cadastros", href: "/cadastros", descricao: "Postos, combustiveis, fornecedores..." },
    { titulo: "Parametros", href: "/parametros", descricao: "Configuracoes do sistema" },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h1>
      <p className="text-gray-500 mb-8">
        Novo Horizonte Transportadora de Combustiveis
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-green-500 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-green-600 mb-2">
              {card.titulo}
            </h2>
            <p className="text-sm text-gray-500">{card.descricao}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
