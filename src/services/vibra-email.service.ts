import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"
import * as XLSX from "xlsx"
import { createAdminClient } from "@/lib/supabase/admin"
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
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("parametros")
    .select("chave, valor")
    .eq("grupo", "imap")

  const map: Record<string, string> = {}
  for (const p of data || []) {
    map[p.chave] = p.valor
  }

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

const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout em ${label} após ${ms}ms`)), ms))])

export async function fetchVibraEmails(): Promise<{ precos: VibraPreco[]; emailsProcessados: number; restantes: number }> {
  const params = await loadImapParams()
  if (!params.host || !params.user || !params.password) {
    throw new Error("Parâmetros IMAP não configurados")
  }

  const precos: VibraPreco[] = []
  let emailsProcessados = 0
  let restantes = 0

  const client = new ImapFlow({
    host: params.host,
    port: params.port,
    secure: true,
    auth: { user: params.user, pass: params.password },
    logger: false,
  })

  await withTimeout(client.connect(), 8000, "connect")

  try {
    const lock = await withTimeout(client.getMailboxLock(params.folder), 5000, "getMailboxLock")
    try {
      const searchCriteria: any = { seen: false }
      if (params.senderFilter) searchCriteria.from = params.senderFilter

      const uids = await withTimeout(client.search(searchCriteria, { uid: true }), 5000, "search")
      if (!uids || uids.length === 0) {
        const st = await withTimeout(client.status(params.folder, { messages: true, unseen: true }), 5000, "status")
        restantes = (st as any).unseen || 0
        return { precos, emailsProcessados, restantes }
      }

      const uid = uids[0]

      const msg = await withTimeout(client.fetchOne(uid, { source: true, envelope: true, uid: true }, { uid: true }), 8000, "fetchOne")

      if (msg) {
        const subject = msg.envelope?.subject || ""
        if (!params.subjectFilter || subject.includes(params.subjectFilter)) {
          const parsed = await withTimeout(simpleParser(msg.source as any), 8000, "simpleParser")
          const attachments = parsed.attachments || []

          for (const att of attachments) {
            const filename = att.filename || ""
            if (!/^DETA_2_.*\.XLS$/i.test(filename) && !/\.XLS$/i.test(filename)) continue

            const buffer = att.content as Buffer
            const extracted = parseXlsBuffer(buffer)
            precos.push(...extracted)
          }

          await withTimeout(client.messageFlagsAdd(uid, ["\\Seen"], { uid: true }), 5000, "messageFlagsAdd")
          emailsProcessados++
        }
      }

      const st = await withTimeout(client.status(params.folder, { messages: true, unseen: true }), 5000, "status")
      restantes = (st as any).unseen || 0
    } finally {
      lock.release()
    }
  } finally {
    try { await client.logout() } catch {}
  }

  return { precos, emailsProcessados, restantes }
}