import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { encrypt } from "@/lib/crypto"

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("parametros")
    .select("*")
    .order("grupo")
    .order("chave")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()

  // Encrypt sensitive values (chave contains "senha", "login", "email", "senha_app")
  const sensitiveKeys = ["senha", "login", "email", "senha_app", "password", "imap"]
  const isSensitive = sensitiveKeys.some((k) => body.chave?.toLowerCase().includes(k))

  const valor = isSensitive ? encrypt(body.valor) : body.valor

  const { data, error } = await supabase
    .from("parametros")
    .insert({ ...body, valor })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}