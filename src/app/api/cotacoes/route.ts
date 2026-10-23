import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cotacoes")
    .select("*, posto:postos(nome, abreviacao), combustivel:combustiveis(nome, abreviacao), fornecedor:fornecedores(nome)")
    .eq("ativo", true)
    .order("data_registro", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { posto_id, combustivel_id, fornecedor_id, preco, fonte, anexo_url } = body

  // Check existing
  const { data: existing } = await supabase
    .from("cotacoes")
    .select("*")
    .eq("posto_id", posto_id)
    .eq("combustivel_id", combustivel_id)
    .eq("fornecedor_id", fornecedor_id)
    .single()

  if (existing) {
    // Record history
    await supabase.from("historico_precos").insert({
      cotacao_id: existing.id,
      preco_anterior: existing.preco,
      preco_novo: preco,
      fonte: fonte || "manual",
    })
    const { data, error } = await supabase
      .from("cotacoes")
      .update({ preco, fonte: fonte || existing.fonte, anexo_url: anexo_url || existing.anexo_url })
      .eq("id", existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from("cotacoes")
    .insert({ posto_id, combustivel_id, fornecedor_id, preco, fonte: fonte || "manual", anexo_url })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}