import { createClient } from "@/lib/supabase/client"
import type { TanqueCarreta, TanquePosto } from "@/types/cadastros"

export async function getTanquesCarreta(): Promise<TanqueCarreta[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("tanques_carreta")
    .select("*")
    .order("identificacao")
  if (error) throw error
  return data as TanqueCarreta[]
}

export async function createTanqueCarreta(tanque: Omit<TanqueCarreta, "id">): Promise<TanqueCarreta> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("tanques_carreta")
    .insert(tanque)
    .select()
    .single()
  if (error) throw error
  return data as TanqueCarreta
}

export async function updateTanqueCarreta(id: string, tanque: Partial<Omit<TanqueCarreta, "id">>): Promise<TanqueCarreta> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("tanques_carreta")
    .update(tanque)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as TanqueCarreta
}

export async function deleteTanqueCarreta(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("tanques_carreta")
    .update({ ativo: false })
    .eq("id", id)
  if (error) throw error
}

export async function getTanquesPosto(postoId?: string): Promise<TanquePosto[]> {
  const supabase = createClient()
  let query = supabase
    .from("tanques_posto")
    .select("*, posto:postos(*), combustivel:combustiveis(*)")
    .order("posto_id")
    .order("numero")

  if (postoId) {
    query = query.eq("posto_id", postoId)
  }

  const { data, error } = await query
  if (error) throw error
  return data as TanquePosto[]
}

export async function createTanquePosto(tanque: Omit<TanquePosto, "id" | "posto" | "combustivel">): Promise<TanquePosto> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("tanques_posto")
    .insert(tanque)
    .select()
    .single()
  if (error) throw error
  return data as TanquePosto
}

export async function updateTanquePosto(id: string, tanque: Partial<Omit<TanquePosto, "id" | "posto" | "combustivel">>): Promise<TanquePosto> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("tanques_posto")
    .update(tanque)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as TanquePosto
}

export async function deleteTanquePosto(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("tanques_posto")
    .update({ ativo: false })
    .eq("id", id)
  if (error) throw error
}