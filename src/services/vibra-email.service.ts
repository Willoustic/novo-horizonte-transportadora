import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"
import * as XLSX from "xlsx"
import { createClient } from "@/lib/supabase/server"
import { decrypt } from "@/lib/crypto"

export interface VibraPreco {
  base: string
  combustivel: string
  preco: number
  dataReferencia: string // YYYY-MM-DD
}

interface ParametrosImap {
  host: string
  port: number
  user: string
  password: string
  folder: string
  senderFilter: string
  subjectFilter: string
}

async function loadImapParams(): Promise<ParametrosImap> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("parametros")
    .select("chave, valor")
    .eq("grupo", "imap")

  const map: Record<string, string> = {}
  for (const p of data || []) {
    map[p.chave] = p.valor
  }

  // Decrypt sensitive fields
  const password = map.imap_password ? decrypt(map.imap_password) : ""

  return {
    host: map.imap_host || "",
    port: parseInt(map.imap_port || "993", 10),
    user: map.imap_user || "",
    password,
    folder: map.imap_folder || "INBOX",
    senderFilter: map.vibra_email_sender || "",
    subjectFilter: map.vibra_email_subject_filter || "",
  }
}

function parseXlsBuffer(buffer: Buffer): VibraPreco[] {
  const workbook = XLSX.read(buffer, { type: "buffer" })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: "" })

  const precos: VibraPreco[] = []
  for (const row of rows) {
    // Try common column names from Vibra DETA file
    const base = row["Base"] || row["BASE"] || row["base"] || row["Posto"] || row["POSTO"] || ""
    const combustivel = row["Combustivel"] || row["COMBUSTIVEL"] || row["combustivel"] || row["Produto"] || row["PRODUTO"] || ""
    const precoRaw = row["Preco"] || row["PRECO"] || row["preco"] || row["Preço"] || row["Valor"] || row["VALOR"] || ""
    const dataRaw = row["Data"] || row["DATA"] || row["data"] || row["Data Referencia"] || ""

    const preco = typeof precoRaw === "string"
      ? parseFloat(precoRaw.replace(",", "."))
      : Number(precoRaw)

    if (!base || !combustivel || isNaN(preco)) continue

    let dataReferencia = new Date().toISOString().split("T")[0]
    if (dataRaw) {
      // Try parse dd/mm/yyyy or yyyy-mm-dd
      const ddmmyyyy = String(dataRaw).match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
      if (ddmmyyyy) {
        dataReferencia = `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`
      } else if (/^\d{4}-\d{2}-\d{2}/.test(String(dataRaw))) {
        dataReferencia = String(dataRaw).slice(0, 10)
      }
    }

    precos.push({ base: String(base).trim(), combustivel: String(combustivel).trim(), preco, dataReferencia })
  }
  return precos
}

export async function fetchVibraEmails(): Promise<{ precos: VibraPreco[]; emailsProcessados: number; restantes: number }> {
  const params = await loadImapParams()
  if (!params.host || !params.user || !params.password) {
    throw new Error("Parâmetros IMAP não configurados")
  }

  const client = new ImapFlow({
    host: params.host,
    port: params.port,
    secure: true,
    auth: { user: params.user, pass: params.password },
    logger: false,
  })

  const precos: VibraPreco[] = []
  let emailsProcessados = 0
  let restantes = 0

  await client.connect()
  try {
    const lock = await client.getMailboxLock(params.folder)
    try {
      // Search unseen emails from Vibra sender
      const searchCriteria: any = { seen: false }
      if (params.senderFilter) searchCriteria.from = params.senderFilter

      const messages = client.fetch(searchCriteria, { source: true, uid: true })
      let processedOne = false

      for await (const msg of messages) {
        // If subject filter configured, check subject
        if (params.subjectFilter && !msg.envelope?.subject?.includes(params.subjectFilter)) {
          continue
        }

        const parsed = await simpleParser(msg.source as any)
        const attachments = parsed.attachments || []

        for (const att of attachments) {
          const filename = att.filename || ""
          if (!/^DETA_2_.*\.XLS$/i.test(filename) && !/\.XLS$/i.test(filename)) continue

          const buffer = att.content as Buffer
          const extracted = parseXlsBuffer(buffer)
          precos.push(...extracted)
        }

        // Mark as read
        await client.messageFlagsAdd(msg.uid, ["\\Seen"], { uid: true })
        emailsProcessados++
        processedOne = true

        // Process only one email per call (Vercel 10s limit)
        break
      }

      // Count remaining unseen
      const st = await client.status(params.folder, { messages: true, unseen: true })
      restantes = (st as any).unseen || 0
    } finally {
      lock.release()
    }
  } finally {
    await client.logout()
  }

  return { precos, emailsProcessados, restantes }
}
