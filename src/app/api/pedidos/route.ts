import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("pedidos")
    .select("*, posto:postos(nome, abreviacao), itens:itens_pedido(*, combustivel:combustiveis(nome, abreviacao))")
    .order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { posto_id, observacoes, itens } = body

  const { data: pedido, error: pedidoError } = await supabase
    .from("pedidos")
    .insert({ posto_id, observacao: observacoes, data: new Date().toISOString().split("T")[0] })
    .select()
    .single()

  if (pedidoError) return NextResponse.json({ error: pedidoError.message }, { status: 500 })

  if (itens && itens.length > 0) {
    const itensData = itens.map((item: any) => ({
      pedido_id: pedido.id,
      combustivel_id: item.combustivel_id,
      volume_solicitado: item.quantidade_litros,
    }))
    const { error: itensError } = await supabase.from("itens_pedido").insert(itensData)
    if (itensError) return NextResponse.json({ error: itensError.message }, { status: 500 })
  }

  return NextResponse.json(pedido, { status: 201 })
}