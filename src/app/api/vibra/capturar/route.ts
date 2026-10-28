import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  let posto = ""
  let data = ""
  try {
    const body = await request.json()
    posto = body?.posto || ""
    data = body?.data || ""
  } catch {
    // no body, run all
  }

  if (posto === "ALL" || !posto) {
    posto = "ALL"
  }

  const supabase = await createClient()

  // Deleta precos fonte='vibra' da data selecionada antes de recapturar
  if (data) {
    const start = `${data}T00:00:00.000Z`
    const end = `${data}T23:59:59.999Z`
    const { error: delError } = await supabase
      .from("cotacoes")
      .delete()
      .eq("fonte", "vibra")
      .gte("data_registro", start)
      .lte("data_registro", end)
    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 })
    }
  }

  const token = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT
  if (!token) {
    return NextResponse.json(
      { error: "GITHUB_TOKEN (ou GITHUB_PAT) não configurado. Defina a variável de ambiente GITHUB_TOKEN." },
      { status: 500 }
    )
  }

  const owner = process.env.GITHUB_REPO_OWNER || "Willoustic"
  const repo = process.env.GITHUB_REPO_NAME || "novo-horizonte-transportadora"

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows/vibra-capture.yml/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: "master", inputs: { posto, data } }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ error: text }, { status: res.status })
    }

    return NextResponse.json({ ok: true, message: "Captura agendada no GitHub Actions" })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}