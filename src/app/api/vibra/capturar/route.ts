import { NextResponse } from "next/server"

export async function POST(request: Request) {
  let posto = ""
  try {
    const body = await request.json()
    posto = body?.posto || ""
  } catch {
    // no body, run all
  }

  if (posto === "ALL" || !posto) {
    posto = "ALL"
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
        body: JSON.stringify({ ref: "master", inputs: { posto } }),
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