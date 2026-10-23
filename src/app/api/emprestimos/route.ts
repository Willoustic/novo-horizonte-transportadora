import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const data = searchParams.get("data")
  const supabase = await createClient()

  let query = supabase
    .from("emprestimos")
    .select("*, combustivel:combustiveis(nome, abreviacao), posto_origem:postos!posto_origem_id(nome, abreviacao), posto_destino:postos!posto_destino_id(nome, abreviacao)")

  if (data) {
    query = query.eq("data", data)
  }

  const { data: emprestimos, error } = await query.order("data", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(emprestimos)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const { data, error } = await supabase
    .from("emprestimos")
    .insert(body)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")
  const supabase = await createClient()

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 })

  const { error } = await supabase
    .from("emprestimos")
    .update({ ativo: false })
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
