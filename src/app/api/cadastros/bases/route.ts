import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

const baseSchema = z.object({
  nome: z.string().min(1, "nome obrigatório"),
  abreviacao: z.string().min(1, "abreviação obrigatória"),
})

export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("bases")
    .select("*")
    .order("nome")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json()
  const parsed = baseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", issues: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const { data, error } = await supabase
    .from("bases")
    .insert(parsed.data)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
