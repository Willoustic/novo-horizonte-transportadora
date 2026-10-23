import { createClient } from "@/lib/supabase/client"
import type { Fornecedor } from "@/types/cadastros"

export async function getFornecedores(): Promise<Fornecedor[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("fornecedores")
    .select("*")
    .order("nome")
  if (error) throw error
  return data as Fornecedor[]
}

export async function createFornecedor(fornecedor: Omit<Fornecedor, "id">): Promise<Fornecedor> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("fornecedores")
    .insert(fornecedor)
    .select()
    .single()
  if (error) throw error
  return data as Fornecedor
}

export async function updateFornecedor(id: string, fornecedor: Partial<Omit<Fornecedor, "id">>): Promise<Fornecedor> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("fornecedores")
    .update(fornecedor)
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data as Fornecedor
}

export async function deleteFornecedor(id: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from("fornecedores")
    .update({ ativo: false })
    .eq("id", id)
  if (error) throw error
}