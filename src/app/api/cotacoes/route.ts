import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserPerfil, temAcessoDashboard } from "@/lib/supabase/profiles"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = searchParams.get("data")
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const perfil = await getUserPerfil(supabase, user.id)
  if (!temAcessoDashboard(perfil)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }

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

  const { data: cotacoes, error } = await query
    .select("*, posto:postos(nome, abreviacao), combustivel:combustiveis(nome, abreviacao), fornecedor:fornecedores(nome), base:bases(nome, abreviacao)")
    .order("data_registro", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(cotacoes)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const perfil = await getUserPerfil(supabase, user.id)
  if (!temAcessoDashboard(perfil)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }
  const body = await request.json()
  const { posto_id, combustivel_id, fornecedor_id, preco, fonte, anexo_url, base_id, data_registro } = body

  const dataRegistro = data_registro ? new Date(data_registro).toISOString() : new Date().toISOString()

  // Check existing per (posto_id, combustivel_id, fornecedor_id, base_id)
  // so a new capture overwrites the current price for that base instead of duplicating.
  let existingQuery = supabase
    .from("cotacoes")
    .select("*")
    .eq("posto_id", posto_id)
    .eq("combustivel_id", combustivel_id)
    .eq("fornecedor_id", fornecedor_id)

  const baseIdFiltrado = base_id == null || base_id === "" ? null : base_id
  if (baseIdFiltrado === null) {
    existingQuery = existingQuery.is("base_id", null)
  } else {
    existingQuery = existingQuery.eq("base_id", baseIdFiltrado)
  }

  const { data: existingRows } = await existingQuery
  const existing = existingRows?.[0]

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
      .update({ preco, fonte: fonte || existing.fonte, anexo_url: anexo_url || existing.anexo_url, base_id: baseIdFiltrado ?? existing.base_id, data_registro: dataRegistro })
      .eq("id", existing.id)
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabase
    .from("cotacoes")
    .insert({ posto_id, combustivel_id, fornecedor_id, preco, fonte: fonte || "manual", anexo_url, base_id: baseIdFiltrado ?? null, data_registro: dataRegistro })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}