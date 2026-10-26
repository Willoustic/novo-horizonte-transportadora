import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encrypt } from "@/lib/crypto"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data, error } = await supabase.from("parametros").select("*").eq("id", id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const body = await request.json()

  const sensitiveKeys = ["senha", "login", "email", "senha_app", "password", "imap"]
  const isSensitive = body.chave
    ? sensitiveKeys.some((k) => body.chave.toLowerCase().includes(k))
    : false

  if (isSensitive && body.valor && !body.valor.includes(":")) {
    body.valor = encrypt(body.valor)
  }

  const { data, error } = await supabase
    .from("parametros")
    .update(body)
    .eq("id", id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { error } = await supabase.from("parametros").delete().eq("id", id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}