import { createClient } from "./server"

export type Perfil = "admin" | "padrao" | "restrito"

export interface UsuarioPerfil {
  id: string
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
}

type SupabaseServer = Awaited<ReturnType<typeof createClient>>

/**
 * Busca o perfil do usuario na tabela `usuarios` usando o server client.
 * Deve ser chamado apenas em Server Components (layout, rotas de API).
 * Retorna null quando o usuario nao existe na tabela ou deu erro.
 */
export async function getUserPerfil(
  supabase: SupabaseServer,
  userId: string
): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("perfil")
    .eq("id", userId)
    .single()

  if (error || !data) {
    return null
  }

  return (data.perfil ?? null) as Perfil | null
}

/**
 * Busca dados completos do usuario (incluindo perfil).
 */
export async function getUsuarioById(
  supabase: SupabaseServer,
  userId: string
): Promise<UsuarioPerfil | null> {
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nome, email, perfil, ativo")
    .eq("id", userId)
    .single()

  if (error || !data) {
    return null
  }

  return data as UsuarioPerfil
}

/**
 * Verifica se o usuario tem acesso ao dashboard (perfil admin ou padrao).
 */
export function temAcessoDashboard(perfil: Perfil | null): boolean {
  return perfil === "admin" || perfil === "padrao"
}

/**
 * Verifica se o perfil e admin.
 */
export function isAdmin(perfil: Perfil | null): boolean {
  return perfil === "admin"
}
