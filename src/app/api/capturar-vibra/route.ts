import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserPerfil, temAcessoDashboard } from "@/lib/supabase/profiles";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * POST /api/capturar-vibra
 *
 * Dispara a captura de preços da Vibra via script standalone.
 * Requer autenticação (perfil admin ou padrao).
 * Aceita corpo opcional: { "posto": "VITORIA" } para filtrar por posto.
 *
 * Resposta padronizada: nunca expõe stdout/stderr brutos do script.
 * O resumo estruturado (CapturaResumo) vem do stdout do script; diagnósticos
 * vão para stderr e não são expostos na resposta.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const perfil = await getUserPerfil(supabase, user.id);
  if (!temAcessoDashboard(perfil)) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  let postoFilter: string | undefined;
  try {
    const body = (await request.json()) as { posto?: string };
    postoFilter = body.posto;
  } catch {
    // Corpo opcional; ignora se não for JSON válido
  }

  const args: string[] = [];
  if (postoFilter) {
    args.push(`--posto=${postoFilter}`);
  }

  try {
    const { stdout } = await execFileAsync(
      "npx",
      ["tsx", "scripts/vibra-capture.ts", ...args],
      {
        cwd: process.cwd(),
        timeout: 300_000, // 5 minutos (alinhado com vercel.json maxDuration)
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
        },
      },
    );

    // T2.6: stdout contém o JSON estruturado CapturaResumo.
    // Diagnósticos vão para stderr (console.error) e não são expostos na resposta.
    let resumo: unknown;
    try {
      resumo = JSON.parse(stdout);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Saída do script de captura não é um JSON válido.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Captura de preços da Vibra concluída.",
      resumo,
    });
  } catch (err: any) {
    // Nunca expõe stdout/stderr brutos (podem conter diagnósticos sensíveis).
    return NextResponse.json(
      {
        success: false,
        error: err.message || "Falha ao executar captura de preços da Vibra.",
      },
      { status: 500 },
    );
  }
}
