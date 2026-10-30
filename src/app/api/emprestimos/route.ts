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
    // Emprestimos pendentes aparecem em todas as datas a partir da data do emprestimo
    // Quitados aparecem apenas na data da devolucao (ou data do emprestimo se sem devolucao)
    query = query.or(`and(data_emprestimo.eq.${data},status.eq.pendente),and(data_emprestimo.lte.${data},status.eq.devolvido_parcial),and(data_emprestimo.lte.${data},status.eq.devolvido)`)
  }

  const { data: emprestimos, error } = await query.order("data_emprestimo", { ascending: false })
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
    .delete()
    .eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
