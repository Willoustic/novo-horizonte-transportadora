import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("carregamentos")
    .select("*, posto_destino:postos(nome, abreviacao), motorista:motoristas(nome), cavalo:cavalos(placa), tanque_carreta:tanques_carreta(identificacao)")
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
  const { base_origem, base_id, ...rest } = body
  const updateData: any = { ...rest }
  if (base_id) updateData.base_id = base_id
  else if (base_origem) {
    const { data: baseRes } = await supabase
      .from("bases")
      .select("id")
      .eq("abreviacao", base_origem)
      .single()
    if (baseRes) updateData.base_id = baseRes.id
  }
  const { data, error } = await supabase
    .from("carregamentos")
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
    .from("carregamentos")
    .delete()
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}