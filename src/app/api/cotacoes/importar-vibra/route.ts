import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchVibraEmails } from "@/services/vibra-email.service"
import { createAdminClient } from "@/lib/supabase/admin"

const CRON_SECRET = process.env.CRON_SECRET || ""

export async function POST(request: Request) {
  // Authenticate via CRON_SECRET
  const auth = request.headers.get("authorization") || ""
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = createAdminClient()

  // Load Vibra supplier (fornecedor tipo 'vibra' or name contains 'Vibra')
  const { data: fornecedorVibra } = await supabase
    .from("fornecedores")
    .select("id")
    .or("tipo.eq.vibra,nome.ilike.%vibra%")
    .limit(1)
    .single()

  if (!fornecedorVibra) {
    return NextResponse.json({ error: "Fornecedor Vibra não encontrado" }, { status: 404 })
  }

  // Load mapping caches
  const { data: postos } = await supabase
    .from("postos")
    .select("id, codigo_base_vibra")
    .eq("ativo", true)
  const postoMap = new Map<string, string>()
  for (const p of postos || []) {
    if (p.codigo_base_vibra) postoMap.set(p.codigo_base_vibra.toUpperCase(), p.id)
  }

  const { data: combustiveis } = await supabase
    .from("combustiveis")
    .select("id, codigo_vibra")
    .eq("ativo", true)
  const combustivelMap = new Map<string, string>()
  for (const c of combustiveis || []) {
    if (c.codigo_vibra) combustivelMap.set(c.codigo_vibra.toUpperCase(), c.id)
  }

  let result
  try {
    result = await fetchVibraEmails()
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Erro ao ler e-mails" }, { status: 500 })
  }

  const { precos, emailsProcessados, restantes } = result

  let importados = 0
  const erros: string[] = []

  for (const preco of precos) {
    const postoId = postoMap.get(preco.base.toUpperCase())
    const combustivelId = combustivelMap.get(preco.combustivel.toUpperCase())

    if (!postoId) {
      erros.push(`Base não mapeada: ${preco.base}`)
      continue
    }
    if (!combustivelId) {
      erros.push(`Combustível não mapeado: ${preco.combustivel}`)
      continue
    }

    // Upsert cotação (reutiliza lógica do POST /api/cotacoes)
    const { data: existing } = await supabase
      .from("cotacoes")
      .select("id, preco")
      .eq("posto_id", postoId)
      .eq("combustivel_id", combustivelId)
      .eq("fornecedor_id", fornecedorVibra.id)
      .single()

    if (existing) {
      await supabase.from("historico_precos").insert({
        cotacao_id: existing.id,
        preco_anterior: existing.preco,
        preco_novo: preco.preco,
        fonte: "vibra",
      })
      const { error } = await supabase
        .from("cotacoes")
        .update({ preco: preco.preco, fonte: "vibra", data_registro: `${preco.dataReferencia}T00:00:00.000Z` })
        .eq("id", existing.id)
      if (error) {
        erros.push(`Erro ao atualizar cotação: ${error.message}`)
        continue
      }
    } else {
      const { error } = await supabase
        .from("cotacoes")
        .insert({
          posto_id: postoId,
          combustivel_id: combustivelId,
          fornecedor_id: fornecedorVibra.id,
          preco: preco.preco,
          fonte: "vibra",
          data_registro: `${preco.dataReferencia}T00:00:00.000Z`,
        })
      if (error) {
        erros.push(`Erro ao inserir cotação: ${error.message}`)
        continue
      }
    }
    importados++
  }

  return NextResponse.json({
    success: true,
    emailsProcessados,
    restantes,
    precosEncontrados: precos.length,
    importados,
    erros,
    debug: result.debug,
  })
}