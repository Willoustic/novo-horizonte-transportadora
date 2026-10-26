import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = searchParams.get("data")
  const supabase = await createClient()

  let query = supabase
    .from("cotacoes")
    .select("*, posto:postos(nome, abreviacao), combustivel:combustiveis(nome, abreviacao), fornecedor:fornecedores(nome)")
    .eq("ativo", true)

  if (data) {
    // data no formato YYYY-MM-DD; data_registro é TIMESTAMPTZ
    const start = `${data}T00:00:00.000Z`
    const end = `${data}T23:59:59.999Z`
    query = query.gte("data_registro", start).lte("data_registro", end)
  }

  const { data: cotacoes, error } = await query.order("data_registro", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(cotacoes)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { posto_id, combustivel_id, fornecedor_id, preco, fonte, anexo_url, data_registro } = body

  const dataRegistro = data_registro ? new Date(data_registro).toISOString() : new Date().toISOString()

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
      .update({ preco, fonte: fonte || existing.fonte, anexo_url: anexo_url || existing.anexo_url, data_registro: dataRegistro })
      .eq("id", existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from("cotacoes")
    .insert({ posto_id, combustivel_id, fornecedor_id, preco, fonte: fonte || "manual", anexo_url, data_registro: dataRegistro })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}