import Link from "next/link";

const cadastros = [
  { href: "/cadastros/postos", label: "Postos" },
  { href: "/cadastros/combustiveis", label: "Combustiveis" },
  { href: "/cadastros/fornecedores", label: "Fornecedores" },
  { href: "/cadastros/motoristas", label: "Motoristas" },
  { href: "/cadastros/cavalos", label: "Cavalos" },
  { href: "/cadastros/tanques-carreta", label: "Tanques de Carreta" },
  { href: "/cadastros/tanques-posto", label: "Tanques de Posto" },
];

export default function CadastrosPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Cadastros
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cadastros.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:border-green-300 hover:shadow-md transition-all"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {c.label}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Gerenciar {c.label.toLowerCase()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
