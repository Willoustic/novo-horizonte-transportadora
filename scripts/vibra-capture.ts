import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

chromium.use(stealth());

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
export function decrypt(encryptedText: string): string {
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const parts = encryptedText.split(":");
  if (parts.length !== 3) return encryptedText;
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Timeout constants
const TIMEOUT_30S = 30000;
const TIMEOUT_20S = 20000;
const TIMEOUT_10S = 10000;
const TIMEOUT_8S = 8000;
const TIMEOUT_3S = 3000;
const TIMEOUT_5S = 5000;
const TIMEOUT_1_5S = 1500;
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Logger centralizado: todo output de console passa por aqui.
async function logEtapa(
  postoAbrev: string,
  etapa: string,
  mensagem: string,
): Promise<void> {
  const agora = new Date().toISOString();
  console.error(`[${postoAbrev}][${etapa}] ${agora} - ${mensagem}`);
}

const EMAIL_HOST = "imap.gmail.com";
const EMAIL_USER = process.env.VIBRA_EMAIL_USER!;
const EMAIL_PASS = process.env.VIBRA_EMAIL_PASS!;

interface VibraPreco {
  produto: string;
  preco: number;
  base: string;
  posto: string;
}

async function getParam(grupo: string, chave: string): Promise<string | null> {
  const { data } = await supabase
    .from("parametros")
    .select("valor")
    .eq("grupo", grupo)
    .eq("chave", chave)
    .single();
  return data?.valor ?? null;
}

async function waitFor2FACode(since: Date): Promise<string | null> {
  const client = new ImapFlow({
    host: EMAIL_HOST,
    port: 993,
    secure: true,
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      const uids = await client.search({ since }, { uid: true });
      const sortedUids = (uids || []).sort((a, b) => b - a);
      for (const uid of sortedUids) {
        const msg = (await client.fetchOne(
          uid,
          { source: true },
          { uid: true },
        )) as { source?: Buffer } | false;
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const subject = parsed.subject || "";
        if (
          !subject.includes(
            "Código de verificação para autenticação - Vibra Energia",
          )
        )
          continue;
        const text = parsed.text || "";
        const match = text.match(
          /Utilize o código abaixo para concluir sua autenticação no Canal de Negócios:\s*\n?\s*(\d{6})/i,
        );
        if (match) return match[1];
      }
      await new Promise((r) => setTimeout(r, TIMEOUT_5S));
    }
    return null;
  } finally {
    lock.release();
    await client.logout();
  }
}

export function extractPrices(
  bodyText: string,
): { produto: string; preco: string }[] {
  const results: { produto: string; preco: string }[] = [];
  const regex =
    /([A-Za-zÁÉÍÓÚÃÕÇáéíóúãõç][A-Za-zÁÉÍÓÚÃÕÇáéíóúãõç\s\d]+?)\s*\n\s*COD:\d+\s*\n\s*Base:\s*\n\s*(?:\w+\s*\n\s*)?Preço:\s*R\$\s*([\d.,]+)/g;
  let m;
  while ((m = regex.exec(bodyText)) !== null) {
    results.push({ produto: m[1].trim(), preco: m[2] });
  }
  return results;
}

async function captureForPosto(
  postoId: string,
  postoNome: string,
  postoAbrev: string,
): Promise<VibraPreco[]> {
  const rawLogin = await getParam("vibra", `vibra_${postoAbrev}_login`);
  const rawSenha = await getParam("vibra", `vibra_${postoAbrev}_senha`);
  const login = rawLogin ? decrypt(rawLogin) : null;
  const senha = rawSenha ? decrypt(rawSenha) : null;
  if (!login || !senha) {
    await logEtapa(
      postoAbrev,
      "credenciais",
      `Credenciais não encontradas para ${postoAbrev}`,
    );
    return [];
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "pt-BR",
  });
  const page = await context.newPage();
  const precos: VibraPreco[] = [];

  async function screenshotEtapa(etapa: string): Promise<void> {
    try {
      const nomeArquivo = `tmp/vibra-${postoAbrev}-${etapa}-${Date.now()}.png`;
      await page.screenshot({ path: nomeArquivo, fullPage: true });
      await logEtapa(
        postoAbrev,
        `${postoAbrev}`,
        `screenshot salvo: ${nomeArquivo}`,
      );
    } catch (e) {
      await logEtapa(
        postoAbrev,
        `${postoAbrev}`,
        `falha ao salvar screenshot: ${(e as Error).message}`,
      );
    }
  }

  try {
    // Etapa 1 — navegação para o portal
    await logEtapa(
      postoAbrev,
      "1-navegacao",
      "Acessando portal Vibra central-de-pedidos",
    );
    await page.goto(
      "https://cn.vibraenergia.com.br/central-de-pedidos/#/vitrine?simulador=true",
      { waitUntil: "domcontentloaded", timeout: TIMEOUT_30S },
    );
    await page.waitForTimeout(TIMEOUT_3S);
    await logEtapa(postoAbrev, "1-navegacao", `URL atual: ${page.url()}`);
    await screenshotEtapa("1-navegacao");

    // Etapa 2 — login SSO
    if (await page.$('input[name="username"]')) {
      await logEtapa(
        postoAbrev,
        "2-login-sso",
        "Campo de usuário detectado. Preenchendo credenciais...",
      );
      await page.fill('input[name="username"]', login);
      await page.fill('input[name="password"]', senha);
      await logEtapa(
        postoAbrev,
        "2-login-sso",
        "Credenciais preenchidas. Clicando no botão loginBt...",
      );
      await page.click('input[name="loginBt"]');
      await page.waitForTimeout(TIMEOUT_3S);
      await logEtapa(
        postoAbrev,
        "2-login-sso",
        "Aguardando 20s para o campo 2FA aparecer (não aparece imediatamente)...",
      );
      await page.waitForTimeout(TIMEOUT_20S);
      await logEtapa(
        postoAbrev,
        "2-login-sso",
        `URL após espera 2FA: ${page.url()}`,
      );
      await screenshotEtapa("2-login-sso-apos-espera");

      const since = new Date(Date.now() - 300000);
      await logEtapa(
        postoAbrev,
        "2-login-sso",
        "Buscando código 2FA por e-mail (IMAP Gmail)...",
      );
      const code = await waitFor2FACode(since);
      if (code) {
        await logEtapa(
          postoAbrev,
          "2-login-sso",
          `Código 2FA recebido: ${code}. Preenchendo campo OTP...`,
        );
        const codeInput = await page.$('input[name="otp"], input#otp');
        if (codeInput) {
          await codeInput.fill("");
          await codeInput.type(code, { delay: 100 });
          await page.waitForTimeout(1000);
          await logEtapa(
            postoAbrev,
            "2-login-sso",
            "Clicando em mfaValidate para validar 2FA...",
          );
          await page.click('input[name="mfaValidate"]');
          await page.waitForTimeout(TIMEOUT_10S);
          await logEtapa(
            postoAbrev,
            "2-login-sso",
            `URL após validação 2FA: ${page.url()}`,
          );
          await screenshotEtapa("2-login-sso-apos-2fa");
        } else {
          await logEtapa(
            postoAbrev,
            "2-login-sso",
            "AVISO: campo OTP não encontrado no DOM após 20s de espera.",
          );
        }
      } else {
        await logEtapa(
          postoAbrev,
          "2-login-sso",
          "ERRO: código 2FA não recebido por e-mail no intervalo de 5 minutos.",
        );
      }
    } else {
      await logEtapa(
        postoAbrev,
        "2-login-sso",
        "Campo de usuário não detectado — possivelmente já autenticado.",
      );
    }

    // Etapa 3 — fechar modal inicial (se houver)
    await logEtapa(
      postoAbrev,
      "3-fechar-modal-inicial",
      "Verificando modal inicial para fechar...",
    );
    const closeBtnInicial = await page.$('i.md-icons:has-text("close")');
    if (closeBtnInicial) {
      await closeBtnInicial.click({ force: true });
      await page.waitForTimeout(2000);
      await logEtapa(
        postoAbrev,
        "3-fechar-modal-inicial",
        "Modal inicial fechado.",
      );
    } else {
      await logEtapa(
        postoAbrev,
        "3-fechar-modal-inicial",
        "Nenhum modal inicial detectado.",
      );
    }
    await screenshotEtapa("3-fechar-modal-inicial");

    async function captureBase(base: string) {
      await logEtapa(
        postoAbrev,
        `4-captura-${base}`,
        `Iniciando captura de preços para a base ${base}...`,
      );
      await screenshotEtapa(`4-captura-${base}-antes`);
      const bodyText = await page.evaluate(() => document.body.innerText);
      const prices = extractPrices(bodyText);
      for (const p of prices) {
        const preco = parseFloat(p.preco.replace(/\./g, "").replace(",", "."));
        if (preco > 0) {
          precos.push({ produto: p.produto, preco, base, posto: postoNome });
        }
      }
      await logEtapa(
        postoAbrev,
        `4-captura-${base}`,
        `${prices.length} preço(ões) extraído(s) para a base ${base}.`,
      );
      for (const p of prices) {
        const preco = parseFloat(p.preco.replace(/\./g, "").replace(",", "."));
        if (preco > 0) {
          await logEtapa(
            postoAbrev,
            `4-captura-${base}`,
            `  -> ${p.produto} | Base: ${base} | R$ ${preco.toFixed(4)}`,
          );
        }
      }
      await screenshotEtapa(`4-captura-${base}-depois`);
      await logEtapa(
        postoAbrev,
        `4-captura-${base}`,
        `${prices.length} preço(ões) para a base ${base}`,
      );
    }

    async function waitForEl(selector: string, timeoutMs = 5000) {
      try {
        await page.waitForSelector(selector, { timeout: timeoutMs });
        return await page.$(selector);
      } catch (e) {
        await logEtapa(
          postoAbrev,
          "waitForEl",
          `Seletor não encontrado: ${selector} (${(e as Error).message})`,
        );
        return null;
      }
    }

    async function closeModal() {
      const closeBtn = await page.$('i.md-icons:has-text("close")');
      if (closeBtn) {
        await closeBtn.click({ force: true });
        await page.waitForTimeout(2000);
        await logEtapa(postoAbrev, "modal", "modal fechado");
      }
    }

    async function diagnosticarErro(etapa: string, motivo: string) {
      try {
        const estado = await page.evaluate(() => ({
          url: window.location.href,
          title: document.title,
          textLen: document.body.textContent?.length ?? 0,
          text: document.body.textContent?.slice(0, 500) ?? "",
        }));
        await logEtapa(
          postoAbrev,
          etapa,
          `DIAGNOSTICO ${motivo}: url=${estado.url} title=${estado.title} textLen=${estado.textLen}`,
        );
      } catch (e) {
        await logEtapa(
          postoAbrev,
          etapa,
          `Falha ao capturar diagnostico: ${(e as Error).message}`,
        );
      }
      try {
        await screenshotEtapa(`${etapa}-${motivo}`);
      } catch (e) {
        await logEtapa(
          postoAbrev,
          etapa,
          `Falha ao capturar diagnostico: ${(e as Error).message}`,
        );
        try {
          await screenshotEtapa(`${etapa}-${motivo}`);
        } catch (screenshotErr) {
          await logEtapa(
            postoAbrev,
            etapa,
            `Falha ao capturar screenshot: ${(screenshotErr as Error).message}`,
          );
        }
      }
    }

    const BASES = ["BAGAM", "ARCAB", "AISUAP"];

    async function selecionarBase(base: string) {
      await logEtapa(
        postoAbrev,
        `selecionar-base-${base}`,
        `Abrindo seletor de base para ${base}...`,
      );
      const formField = await waitForEl("div.mat-form-field-flex", 8000);
      if (!formField) {
        throw new Error(
          `form-field de seleção de base não encontrado para ${base}`,
        );
      }
      await formField.click({ force: true });
      await page.waitForTimeout(TIMEOUT_1_5S);

      const addBtn = await page.$("i.md-icons.adicionar-bases-icon");
      if (addBtn) {
        await addBtn.click({ force: true });
        await page.waitForTimeout(TIMEOUT_1_5S);
      }

      const input = await page.$("input.mat-autocomplete-trigger");
      if (!input) {
        throw new Error(
          `input.mat-autocomplete-trigger não encontrado para ${base}`,
        );
      }
      await input.fill("");
      await input.type(base, { delay: 100 });
      await page.waitForTimeout(TIMEOUT_1_5S);

      const option = await page.$(`mat-option:has-text("${base}")`);
      if (!option) {
        throw new Error(`mat-option "${base}" não encontrada no dropdown`);
      }
      await option.click({ force: true });
      await page.waitForTimeout(TIMEOUT_1_5S);

      // Verifica se a base foi realmente selecionada antes de simular
      const selecionado = await page.$("div.mat-form-field-flex");
      const texto = selecionado ? await selecionado.innerText() : "";
      if (!texto.includes(base)) {
        throw new Error(
          `Base "${base}" não foi selecionada (campo mostra: ${texto.slice(
            0,
            200,
          )})`,
        );
      }
      await logEtapa(
        postoAbrev,
        `selecionar-base-${base}`,
        `Base "${base}" selecionada.`,
      );
    }

    async function simularPreços(base: string) {
      await logEtapa(
        postoAbrev,
        `simular-${base}`,
        `Clicando em 'Simular preços' para ${base}...`,
      );
      const btn = await page.$('button:has-text("Simular preços")');
      if (!btn) {
        throw new Error(`botão "Simular preços" não encontrado para ${base}`);
      }
      await btn.click({ force: true });
      await page.waitForTimeout(TIMEOUT_3S);
      // Baseline do texto ANTES da renderização; só prossegue quando o corpo mudar de verdade
      // (evita retornar precos de base anterior/cached quando o corpo ja contem 'R$').
      const textoAntes = await page.evaluate(() => document.body.innerText);
      const deadline = Date.now() + 30000;
      while (Date.now() < deadline) {
        const corpo = await page.evaluate(() => document.body.innerText);
        if (corpo !== textoAntes && /R\$\s*[\d.,]+/.test(corpo)) {
          await logEtapa(
            postoAbrev,
            `simular-${base}`,
            "Preços renderizados para a base.",
          );
          return;
        }
        await page.waitForTimeout(TIMEOUT_1_5S);
      }
      await logEtapa(
        postoAbrev,
        `simular-${base}`,
        "AVISO: tempo esgotado aguardando preços (prosseguindo com captura).",
      );
    }

    // Captura uma base por vez, em estado limpo, sem contaminação entre bases.
    // Cada base tem try/catch proprio: uma falha (ex.: seletor ausente na BAGAM)
    // registra o erro e continua para as bases restantes em vez de abortar tudo.
    try {
      for (const base of BASES) {
        try {
          await logEtapa(
            postoAbrev,
            `captura-${base}`,
            `Iniciando captura isolada da base ${base}...`,
          );
          // Re-abre o simulador para cada base (estado limpo, sem re-login/2FA)
          await page.goto(
            "https://cn.vibraenergia.com.br/central-de-pedidos/#/vitrine?simulador=true",
            {
              waitUntil: "domcontentloaded",
              timeout: 30000,
            },
          );
          await page.waitForTimeout(TIMEOUT_3S);
          await closeModal();
          await page.waitForTimeout(1000);

          await selecionarBase(base);
          await simularPreços(base);
          await captureBase(base);
          await closeModal();
          await logEtapa(
            postoAbrev,
            `captura-${base}`,
            `Captura isolada da base ${base} concluída.`,
          );
        } catch (err) {
          await logEtapa(
            postoAbrev,
            `captura-${base}`,
            `ERRO: ${(err as Error).message}`,
          );
          await diagnosticarErro(`captura-${base}`, base);
          continue;
        }
      }
    } catch (err) {
      await logEtapa(
        postoAbrev,
        `captura-geral`,
        `Erro na captura: ${(err as Error).message}`,
      );
    } finally {
      await browser.close();
    }

    return precos;
  } catch (err) {
    await logEtapa(
      postoAbrev,
      "captura-geral",
      `Erro na captura: ${(err as Error).message}`,
    );
  }
}
async function main() {
  try {
    const { data: postos } = await supabase
      .from("postos")
      .select("id, nome, abreviacao")
      .eq("tipo", "FILIAL")
      .eq("ativo", true);

    const { data: fornecedorVibra } = await supabase
      .from("fornecedores")
      .select("id")
      .or("tipo.eq.vibra,nome.ilike.%vibra%")
      .limit(1)
      .single();
    const fornecedorId = fornecedorVibra?.id;

    const { data: combustiveis } = await supabase
      .from("combustiveis")
      .select("id, nome")
      .eq("ativo", true);
    const combustivelMap = new Map<string, string>();
    for (const c of combustiveis || []) {
      combustivelMap.set(c.nome.toLowerCase(), c.id);
    }
    // Map Vibra product names to DB combustivel names
    combustivelMap.set(
      "óleo diesel b s500",
      combustivelMap.get("diesel s500")!,
    );
    combustivelMap.set("óleo diesel b s10", combustivelMap.get("diesel s10")!);
    combustivelMap.set(
      "gasolina comum c",
      combustivelMap.get("gasolina comum")!,
    );
    combustivelMap.set(
      "gasolina comum c adit petrobras grid",
      combustivelMap.get("gasolina aditivada")!,
    );
    combustivelMap.set(
      "gasolina comum c aditivada",
      combustivelMap.get("gasolina aditivada")!,
    );
    combustivelMap.set(
      "etanol hidratado combustivel",
      combustivelMap.get("etanol")!,
    );

    // Build base abreviacao -> id map for base_id FK lookup
    const { data: basesData } = await supabase
      .from("bases")
      .select("id, abreviacao");
    const baseIdMap: Record<string, string> = {};
    basesData?.forEach((b) => {
      baseIdMap[b.abreviacao] = b.id;
    });

    // Allow filtering by a single posto via --posto=ABREV.
    // "ALL" or empty means all active FILIAL postos.
    const postoArg = process.argv.find((a) => a.startsWith("--posto="));
    const postoFilter = postoArg ? postoArg.split("=")[1] : null;
    const isAllPostos = !postoFilter || postoFilter === "ALL";
    const filteredPostos = isAllPostos
      ? postos || []
      : (postos || []).filter((p) => p.abreviacao === postoFilter);

    for (const posto of filteredPostos) {
      const precos = await captureForPosto(
        posto.id,
        posto.nome,
        posto.abreviacao,
      );
      for (const p of precos) {
        // preço formatado abaixo no logEtapa ou removido
      }

      for (const p of precos) {
        const combustivelId = combustivelMap.get(p.produto.toLowerCase());
        if (!combustivelId) {
          continue;
        }
        const baseId = baseIdMap[p.base];
        if (!baseId) {
          continue;
        }
        const { data: existing } = await supabase
          .from("cotacoes")
          .select("id, preco")
          .eq("posto_id", posto.id)
          .eq("combustivel_id", combustivelId)
          .eq("fornecedor_id", fornecedorId)
          .eq("base_id", baseId)
          .single();

        const now = new Date().toISOString();
        if (existing) {
          const { error: histError } = await supabase
            .from("historico_precos")
            .insert({
              cotacao_id: existing.id,
              preco_anterior: existing.preco,
              preco_novo: p.preco,
              fonte: "vibra",
            });
          if (histError)
            await logEtapa(
              posto.abreviacao,
              "historico",
              `Erro histórico ${p.base}: ${histError.message}`,
            );
          const { error: updError } = await supabase
            .from("cotacoes")
            .update({
              preco: p.preco,
              fonte: "vibra",
              data_registro: now,
              base_id: baseId,
            })
            .eq("id", existing.id);
          if (updError)
            await logEtapa(
              posto.abreviacao,
              "update",
              `Erro update ${p.base}: ${updError.message}`,
            );
        } else {
          const { error: insError } = await supabase.from("cotacoes").insert({
            posto_id: posto.id,
            combustivel_id: combustivelId,
            fornecedor_id: fornecedorId,
            preco: p.preco,
            fonte: "vibra",
            data_registro: now,
            base_id: baseId,
          });
          if (insError)
            await logEtapa(
              posto.abreviacao,
              "insert",
              `Erro insert ${p.base}: ${insError.message}`,
            );
        }
      }
    }

    await logEtapa("SISTEMA", "concluido", "Concluído.");
  } catch (e) {
    await logEtapa("SISTEMA", "captura-geral", `Erro: ${(e as Error).message}`);
    process.exit(1);
  }
}

main().catch(async (e) => {
  await logEtapa("SISTEMA", "captura-geral", `Erro: ${(e as Error).message}`);
  process.exit(1);
});
