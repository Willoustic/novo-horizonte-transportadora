import { createClient } from "@/lib/supabase/client"
import type { Motorista } from "@/types/cadastros"

export async function getMotoristas(): Promise<Motorista[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("motoristas")
    .select("*")
    .order("nome")
  if (error) throw error
  return data as Motorista[]
}

export async function createMotorista(motorista: Omit<Motorista, "id">): Promise<Motorista> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("motoristas")
    .insert(motorista)
    .select()
    .single()
  if (error) throw error
  return data as Motorista
}

export async function updateMotorista(id: string, motorista: Partial<Omit<Motorista, "id">>): Promise<Motorista> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("motoristas")
    .update(motorista)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as Motorista
}

export async function deleteMotorista(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("motoristas")
    .update({ ativo: false })
    .eq("id", id)
  if (error) throw error
}