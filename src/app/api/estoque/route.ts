import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = searchParams.get("data")
  const supabase = await createClient()

  let query = supabase
    .from("estoque_snapshots")
    .select("*, tanque_posto:tanques_posto(numero, capacidade_litros, estoque_minimo, posto:postos(nome, abreviacao), combustivel:combustiveis(nome, abreviacao))")

  if (data) {
    query = query.eq("data", data)
  }

  const { data: snapshots, error } = await query.order("data", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(snapshots)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { tanque_posto_id, volume, data } = body
  const { data: result, error } = await supabase
    .from("estoque_snapshots")
    .upsert({ tanque_posto_id, volume, data }, { onConflict: "tanque_posto_id,data" })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(result, { status: 201 })
}