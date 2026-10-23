import { createClient } from "@/lib/supabase/client"
import type { Combustivel } from "@/types/cadastros"

export async function getCombustiveis(): Promise<Combustivel[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("combustiveis")
    .select("*")
    .order("nome")
  if (error) throw error
  return data as Combustivel[]
}

export async function createCombustivel(combustivel: Omit<Combustivel, "id">): Promise<Combustivel> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("combustiveis")
    .insert(combustivel)
    .select()
    .single()
  if (error) throw error
  return data as Combustivel
}

export async function updateCombustivel(id: string, combustivel: Partial<Omit<Combustivel, "id">>): Promise<Combustivel> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("combustiveis")
    .update(combustivel)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as Combustivel
}

export async function deleteCombustivel(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("combustiveis")
    .update({ ativo: false })
    .eq("id", id)
  if (error) throw error
}