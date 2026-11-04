import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getUserPerfil, temAcessoDashboard } from "@/lib/supabase/profiles"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const perfil = await getUserPerfil(supabase, user.id)
  if (!temAcessoDashboard(perfil)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }
  const { data, error } = await supabase
    .from("cotacoes")
    .select("*, posto:postos(nome, abreviacao), combustivel:combustiveis(nome, abreviacao), fornecedor:fornecedores(nome), base:bases(nome, abreviacao), historico:historico_precos(*)")
    .eq("id", id)
    .eq("ativo", true)
    .single()
  if (error) return NextResponse.json({ error: "Cotação não encontrada" }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const perfil = await getUserPerfil(supabase, user.id)
  if (!temAcessoDashboard(perfil)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }
  const { id } = await params
  const body = await request.json()

  const allowedFields = ["preco", "fonte", "anexo_url", "base_id", "data_registro"]
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) updateData[field] = body[field]
  }
  if (body.base !== undefined) {
    const { data: baseRes } = await supabase
      .from("bases")
      .select("id")
      .eq("abreviacao", body.base)
      .single()
    if (baseRes?.id) updateData.base_id = baseRes.id
    else updateData.base_id = null
  }

  const { data: existing } = await supabase.from("cotacoes").select("id, preco").eq("id", id).eq("ativo", true).single()

  if (!existing) return NextResponse.json({ error: "Cotação não encontrada" }, { status: 404 })

  if (updateData.preco !== undefined && updateData.preco !== existing.preco) {
    await supabase.from("historico_precos").insert({
      cotacao_id: id,
      preco_anterior: existing.preco,
      preco_novo: updateData.preco,
      fonte: updateData.fonte ?? undefined,
    })
  }

  const { data, error } = await supabase
    .from("cotacoes")
    .update(updateData)
    .eq("id", id)
    .eq("ativo", true)
    .select()
    .single()
  if (error) return NextResponse.json({ error: "Erro ao atualizar cotação" }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const perfil = await getUserPerfil(supabase, user.id)
  if (!temAcessoDashboard(perfil)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }
  const { id } = await params
  const { error } = await supabase
    .from("cotacoes")
    .update({ ativo: false })
    .eq("id", id)
  if (error) return NextResponse.json({ error: "Erro ao excluir cotação" }, { status: 500 })
  return NextResponse.json({ success: true })
}