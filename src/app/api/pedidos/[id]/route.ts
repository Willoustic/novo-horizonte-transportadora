import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, posto:postos(nome, abreviacao), itens:itens_pedido(*, combustivel:combustiveis(nome, abreviacao))")
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
  const updateData: any = {}
  if (body.status) updateData.status = body.status
  if (body.observacoes !== undefined) updateData.observacao = body.observacoes

  // Baixa de entrega exige data de entrega
  if (body.status === "entregue" && !body.data_entrega) {
    return NextResponse.json(
      { error: "Data de entrega é obrigatória para baixar o pedido" },
      { status: 400 }
    )
  }

  const { data, error } = await supabase
    .from("pedidos")
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
  await supabase.from("itens_pedido").delete().eq("pedido_id", id)
  const { error } = await supabase
    .from("pedidos")
    .delete()
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}