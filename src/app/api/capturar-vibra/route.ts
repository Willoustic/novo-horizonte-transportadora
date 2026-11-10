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
        timeout: 300_000, // 5 minutos
        env: {
          ...process.env,
          NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
          SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
          ENCRYPTION_KEY: process.env.ENCRYPTION_KEY!,
        },
      },
    );

    // O script emite um resumo estruturado em JSON na última linha do stdout.
    // Os logs de diagnóstico vão para stderr via logEtapa e nunca são expostos.
    let resumo: {
      postos_processados: number;
      bases_com_sucesso: number;
      bases_com_erro: number;
      total_precos_extraidos: number;
      erros_por_base: Record<string, string>;
    } | null = null;

    const ultimaLinha = stdout.trim().split("\n").pop();
    if (ultimaLinha) {
      try {
        resumo = JSON.parse(ultimaLinha);
      } catch {
        // Se não conseguir fazer parse do JSON, ignora o resumo estruturado.
      }
    }

    return NextResponse.json({
      success: true,
      message: "Captura de preços da Vibra concluída.",
      resumo,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao executar a captura de preços da Vibra.",
      },
      { status: 500 },
    );
  }
}
