import { createClient } from "@/lib/supabase/client"
import type { Cavalo } from "@/types/cadastros"

export async function getCavalos(): Promise<Cavalo[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("cavalos")
    .select("*")
    .order("placa")
  if (error) throw error
  return data as Cavalo[]
}

export async function createCavalo(cavalo: Omit<Cavalo, "id">): Promise<Cavalo> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("cavalos")
    .insert(cavalo)
    .select()
    .single()
  if (error) throw error
  return data as Cavalo
}

export async function updateCavalo(id: string, cavalo: Partial<Omit<Cavalo, "id">>): Promise<Cavalo> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("cavalos")
    .update(cavalo)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as Cavalo
}

export async function deleteCavalo(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("cavalos")
    .update({ ativo: false })
    .eq("id", id)
  if (error) throw error
}