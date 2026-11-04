"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Perfil = "admin" | "padrao" | "restrito";

interface SidebarProps {
  perfil: Perfil;
}

import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Package,
  ArrowRightLeft,
  DollarSign,
  Users,
  Settings,
  Menu,
  X,
  LogOut,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pedidos", label: "Pedidos", icon: ClipboardList },
  { href: "/carregamentos", label: "Carregamentos", icon: Truck },
  { href: "/estoque", label: "Estoque", icon: Package },
  { href: "/emprestimos", label: "Emprestimos", icon: ArrowRightLeft },
  { href: "/cotacoes", label: "Cotacoes", icon: DollarSign },
  { href: "/cadastros", label: "Cadastros", icon: Users },
  { href: "/parametros", label: "Parametros", icon: Settings },
];

export function Sidebar({ perfil }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  const isAdmin = perfil === "admin";

  const visibleNav = NAV.filter((item) => {
    // restrito nao tem acesso a nada no sidebar (redirecionado no layout)
    if (perfil === "restrito") {
      return false;
    }
    // /parametros (e /usuarios, quando existir) so para admin
    if (item.href === "/parametros" && !isAdmin) {
      return false;
    }
    return true;
  });

  async function handleLogout() {
    await supabase.auth.signOut();
    setTheme("light");
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5 text-gray-700 dark:text-gray-200" />
        </button>
        <span className="ml-3 text-sm font-bold text-green-700 dark:text-white">
          NH Transportadora
        </span>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-50 transform transition-transform duration-200 ease-out flex flex-col",
          "md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <span className="text-sm font-bold text-green-700 dark:text-white">
            NH Transportadora
          </span>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <nav className="p-3 space-y-0.5 flex-1">
          {visibleNav.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium"
                    : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {theme === "dark" ? "Tema Claro" : "Tema Escuro"}
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
