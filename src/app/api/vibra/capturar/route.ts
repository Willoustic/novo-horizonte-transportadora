import { NextResponse } from "next/server"
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export async function POST(request: Request) {
  let posto = ""
  try {
    const body = await request.json()
    posto = body?.posto || ""
  } catch {
    // no body, run all
  }

  const cmd = posto
    ? `npx tsx scripts/vibra-capture.ts --posto=${posto}`
    : "npx tsx scripts/vibra-capture.ts"

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: process.cwd(),
      timeout: 300000,
    })
    return NextResponse.json({ ok: true, stdout, stderr, total: 0 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message, stdout: err.stdout, stderr: err.stderr }, { status: 500 })
  }
}