import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = searchParams.get("data")
  const supabase = await createClient()

  let query = supabase
    .from("pedidos")
    .select("*, posto:postos(nome, abreviacao), itens:itens_pedido(*, combustivel:combustiveis(nome, abreviacao))")

  if (data) {
    query = query.eq("data", data)
  }

  const { data: pedidos, error } = await query.order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(pedidos)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { posto_id, observacoes, itens, data } = body

  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .insert({ posto_id, observacao: observacoes, data: data || new Date().toISOString().split("T")[0] })
    .select()
    .single()

  if (pedidoError) return NextResponse.json({ error: pedidoError.message }, { status: 500 })

  if (itens && itens.length > 0) {
    const itensData = []
    for (const item of itens) {
      const { data: tanque } = await supabase
        .from("tanques_posto")
        .select("id")
        .eq("posto_id", pedido.posto_id)
        .eq("combustivel_id", item.combustivel_id)
        .limit(1)
        .maybeSingle()
      if (!tanque) {
        return NextResponse.json(
          { error: `Tanque não encontrado para combustível ${item.combustivel_id} no posto ${pedido.posto_id}` },
          { status: 400 }
        )
      }
      itensData.push({
        pedido_id: pedido.id,
        combustivel_id: item.combustivel_id,
        tanque_posto_id: tanque.id,
        volume_solicitado: item.quantidade_litros,
      })
    }
    const { error: itensError } = await supabase.from("itens_pedido").insert(itensData)
    if (itensError) return NextResponse.json({ error: itensError.message }, { status: 500 })
  }

  return NextResponse.json(pedido, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const supabase = await createClient()

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  await supabase.from("itens_pedido").delete().eq("pedido_id", id)
  const { error } = await supabase
    .from("pedidos")
    .delete()
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
