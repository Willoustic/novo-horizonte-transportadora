import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("cotacoes")
    .select("*, posto:postos(nome, abreviacao), combustivel:combustiveis(nome, abreviacao), fornecedor:fornecedores(nome), historico:historico_precos(*)")
    .eq("id", id)
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()
  const { base, base_id, ...rest } = body
  const updateData: any = { ...rest }
  if (base_id !== undefined) updateData.base_id = base_id
  else if (base !== undefined) {
    const { data: baseRes } = await supabase
      .from("bases")
      .select("id")
      .eq("abreviacao", base)
      .single()
    if (baseRes) updateData.base_id = baseRes.id
    else updateData.base_id = null
  }

  const { data: existing } = await supabase.from("cotacoes").select("*").eq("id", id).single()

  if (existing && body.preco !== undefined && body.preco !== existing.preco) {
    await supabase.from("historico_precos").insert({
      cotacao_id: id,
      preco_anterior: existing.preco,
      preco_novo: body.preco,
      fonte: body.fonte || existing.fonte,
    })
  }

  const { data, error } = await supabase
    .from("cotacoes")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase
    .from("cotacoes")
    .update({ ativo: false })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}