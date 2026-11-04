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
    .from("carregamentos")
    .select("*, posto_destino:postos(nome, abreviacao), motorista:motoristas(nome), cavalo:cavalos(placa), tanque_carreta:tanques_carreta(identificacao), base:bases(nome, abreviacao)")

  if (data) {
    const start = `${data}T00:00:00.000Z`
    const end = `${data}T23:59:59.999Z`
    query = query.gte("created_at", start).lte("created_at", end)
  }

  const { data: carregamentos, error } = await query.order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(carregamentos)
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
  const { base_origem, ...rest } = body
  // base_origem (texto) e mantido para compatibilidade; base_id e a FK nova
  const insertData = { ...rest }
  if (base_origem) {
    // Resolve abreviacao da base para base_id
    const { data: baseRes } = await supabase
      .from("bases")
      .select("id")
      .eq("abreviacao", base_origem)
      .single()
    if (baseRes) insertData.base_id = baseRes.id
  }
  const { data, error } = await supabase
    .from("carregamentos")
    .insert(insertData)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const perfil = await getUserPerfil(supabase, user.id)
  if (!temAcessoDashboard(perfil)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 })
  }

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  const { error } = await supabase
    .from("carregamentos")
    .delete()
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
