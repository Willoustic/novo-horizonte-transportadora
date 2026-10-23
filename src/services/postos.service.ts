import { createClient } from "@/lib/supabase/client"
import type { Posto } from "@/types/cadastros"

export async function getPostos(): Promise<Posto[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("postos")
    .select("*")
    .order("nome")
  if (error) throw error
  return data as Posto[]
}

export async function createPosto(posto: Omit<Posto, "id" | "created_at">): Promise<Posto> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("postos")
    .insert(posto)
    .select()
    .single()
  if (error) throw error
  return data as Posto
}

export async function updatePosto(id: string, posto: Partial<Omit<Posto, "id" | "created_at">>): Promise<Posto> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("postos")
    .update(posto)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as Posto
}

export async function deletePosto(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("postos")
    .update({ ativo: false })
    .eq("id", id)
  if (error) throw error
}