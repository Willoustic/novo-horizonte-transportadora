"use client";

import { Logo } from "@/components/layout/Logo";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setTheme("light");
  }, [setTheme]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("Email ou senha invalidos");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 transition-colors duration-300"
    >
      <div className="w-full max-w-md px-4 py-8 sm:px-6 lg:py-12">
        <div
          className={cn(
            "bg-white dark:bg-gray-800 rounded-2xl shadow-xl border p-8 sm:p-10 transition-colors duration-300",
            "border-gray-200 dark:border-gray-700",
          )}
        >
          <div className="text-center mb-8">
            <Logo width={180} height={45} className="mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              NH Transportadora
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {error && (
              <div
                className={cn(
                  "p-3 rounded-lg text-sm border",
                  "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50",
                  "text-red-600 dark:text-red-400",
                )}
              >
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm transition-colors",
                  "border-gray-300 dark:border-gray-600",
                  "bg-white dark:bg-gray-900",
                  "text-gray-900 dark:text-white",
                  "placeholder-gray-400 dark:placeholder-gray-500",
                  "focus:ring-2 focus:ring-green-500 focus:border-green-500",
                )}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Senha
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 rounded-lg text-sm transition-colors",
                  "border-gray-300 dark:border-gray-600",
                  "bg-white dark:bg-gray-900",
                  "text-gray-900 dark:text-white",
                  "placeholder-gray-400 dark:placeholder-gray-500",
                  "focus:ring-2 focus:ring-green-500 focus:border-green-500",
                )}
                placeholder="........"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-3 px-4 rounded-lg font-medium shadow-sm transition-colors flex items-center justify-center gap-2",
                "bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed",
              )}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Transportadora NH &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
