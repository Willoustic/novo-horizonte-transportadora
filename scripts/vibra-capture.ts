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

// Limite superior de preço plausível (R$/litro), configurável via env var VIBRA_MAX_PRECO.
const VIBRA_MAX_PRECO_ENV = Number(process.env.VIBRA_MAX_PRECO ?? "10000");
const VIBRA_MAX_PRECO =
  Number.isFinite(VIBRA_MAX_PRECO_ENV) && VIBRA_MAX_PRECO_ENV > 0
    ? VIBRA_MAX_PRECO_ENV
    : 10000;

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

const SIMULADOR_URL =
  "https://cn.vibraenergia.com.br/central-de-pedidos/#/vitrine?simulador=true";

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
): { produto: string; preco: string; base: string }[] {
  const results: { produto: string; preco: string; base: string }[] = [];
  const regex =
    /([A-Za-zÁÉÍÓÚÃÕÇáéíóúãõç][A-Za-zÁÉÍÓÚÃÕÇáéíóúãõç\s\d]+?)\s*\n\s*COD:\d+\s*\n\s*Base:\s*\n\s*(\w+)\s*\n\s*Preço:\s*R\$\s*([\d.,]+)/g;
  let m;
  while ((m = regex.exec(bodyText)) !== null) {
    results.push({ produto: m[1].trim(), preco: m[3], base: m[2] });
  }
  return results;
}

async function captureForPosto(
  postoId: string,
  postoNome: string,
  postoAbrev: string,
  bases: string[],
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

  // Aguarda o modal "Simulador de Preços" (mat-dialog-title-0 / qualquer id gerado).
  // Se não estiver aberto, reabre acessando a URL do simulador.
  async function aguardarModalSimulador() {
    let titulo = await waitForEl(
      'mat-dialog-title:has-text("Simulador de Preços")',
      12000,
    );
    if (!titulo) {
      await logEtapa(
        postoAbrev,
        "modal-reabrir",
        "Modal não encontrado. Reabrindo simulador...",
      );
      await page.goto(SIMULADOR_URL, {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUT_30S,
      });
      await page.waitForTimeout(TIMEOUT_3S);
      titulo = await waitForEl(
        'mat-dialog-title:has-text("Simulador de Preços")',
        15000,
      );
      if (!titulo) {
        throw new Error(
          "Modal 'Simulador de Preços' não encontrado após reabertura",
        );
      }
    }
    await logEtapa(
      postoAbrev,
      "modal",
      "Modal 'Simulador de Preços' detectado.",
    );
  }

  // Troca de base via dropdown: abre (arrow_drop_down), clica '+', preenche input,
  // seleciona o primeiro item com Enter.
  async function trocarBase(base: string) {
    await logEtapa(
      postoAbrev,
      `trocar-base-${base}`,
      `Trocando para base ${base}...`,
    );

    const drop = await page.$('i.md-icons:has-text("arrow_drop_down")');
    if (drop) {
      await drop.click({ force: true });
      await page.waitForTimeout(TIMEOUT_1_5S);
    }

    const addBtn = await page.$("i.md-icons.adicionar-bases-icon");
    if (addBtn) {
      await addBtn.click({ force: true });
      await page.waitForTimeout(TIMEOUT_1_5S);
    }

    const input =
      (await page.$('input.mat-input-2[formcontrolname="base"]')) ||
      (await page.$("input.mat-autocomplete-trigger"));
    if (!input) {
      throw new Error(`input de base não encontrado para ${base}`);
    }
    await input.fill("");
    await input.type(base, { delay: 100 });
    await page.waitForTimeout(TIMEOUT_1_5S);

    // Seleciona o primeiro item do autocomplete pressionando Enter.
    await input.press("Enter");
    await page.waitForTimeout(TIMEOUT_1_5S);

    // Verifica se a base foi realmente selecionada antes de simular.
    const selecionado = await page.$("div.mat-form-field-flex");
    const texto = selecionado ? await selecionado.innerText() : "";
    if (!texto.includes(base)) {
      throw new Error(
        `Base "${base}" não selecionada (campo mostra: ${texto.slice(
          0,
          200,
        )})`,
      );
    }
    await logEtapa(
      postoAbrev,
      `trocar-base-${base}`,
      `Base "${base}" selecionada.`,
    );
  }

  async function clicarSimularPrecos(base: string) {
    await logEtapa(
      postoAbrev,
      `simular-${base}`,
      `Clicando em 'Simular preços' para ${base}...`,
    );
    const btn =
      (await page.$('button:has-text("Simular preços")')) ||
      (await page.$('i.md-icons:has-text("arrow_forward")'));
    if (!btn) {
      throw new Error(`botão "Simular preços" não encontrado para ${base}`);
    }
    await btn.click({ force: true });
    await page.waitForTimeout(TIMEOUT_3S);
    // Baseline do texto ANTES da renderização; só prossegue quando o corpo mudar de verdade
    // (evita retornar preços de base anterior/cached quando o corpo já contém 'R$').
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

  async function capturarBase(bodyText: string, base: string) {
    const prices = extractPrices(bodyText);
    let count = 0;
    for (const p of prices) {
      const preco = parseFloat(
        p.preco.replace(/\./g, "").replace(",", "."),
      );
      if (preco > 0 && preco < VIBRA_MAX_PRECO) {
        precos.push({
          produto: p.produto,
          preco,
          base: p.base,
          posto: postoNome,
        });
        count++;
      } else {
        await logEtapa(
          postoAbrev,
          `captura-${base}`,
          `Preço fora da faixa: ${p.produto} base ${p.base} R$ ${preco.toFixed(4)}`,
        );
      }
    }
    await logEtapa(
      postoAbrev,
      `captura-${base}`,
      `${count} preço(ões) capturado(s) para a base ${base}.`,
    );
    for (const p of prices) {
      const preco = parseFloat(
        p.preco.replace(/\./g, "").replace(",", "."),
      );
      if (preco > 0 && preco < VIBRA_MAX_PRECO) {
        await logEtapa(
          postoAbrev,
          `captura-${base}`,
          `  -> ${p.produto} | Base: ${p.base} | R$ ${preco.toFixed(4)}`,
        );
      }
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
        `Falha ao capturar screenshot: ${(e as Error).message}`,
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
    await page.goto(SIMULADOR_URL, {
      waitUntil: "domcontentloaded",
      timeout: TIMEOUT_30S,
    });
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

    // Etapa 3 — aguardar modal do simulador
    await aguardarModalSimulador();
    await screenshotEtapa("3-modal-simulador");

    // Primeira base (padrão, já exibida no modal): capturar sem trocar de base.
    const primeiraBase = bases[0];
    if (primeiraBase) {
      await logEtapa(
        postoAbrev,
        `captura-${primeiraBase}`,
        `Capturando base padrão ${primeiraBase}...`,
      );
      await page.waitForTimeout(TIMEOUT_3S);
      const corpoInicial = await page.evaluate(() => document.body.innerText);
      await capturarBase(corpoInicial, primeiraBase);
      await closeModal();
      await page.waitForTimeout(1000);
    }

    // Bases restantes: trocar via dropdown (+, input, Enter), simular, capturar, fechar modal.
    for (let i = 1; i < bases.length; i++) {
      const base = bases[i];
      try {
        await logEtapa(
          postoAbrev,
          `captura-${base}`,
          `Iniciando captura isolada da base ${base}...`,
        );
        await aguardarModalSimulador();
        await trocarBase(base);
        await clicarSimularPrecos(base);
        await page.waitForTimeout(TIMEOUT_3S);
        const corpo = await page.evaluate(() => document.body.innerText);
        await capturarBase(corpo, base);
        await closeModal();
        await page.waitForTimeout(1000);
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
        try {
          await closeModal();
        } catch {}
        continue;
      }
    }
  } catch (err) {
    await logEtapa(
      postoAbrev,
      "captura-geral",
      `Erro na captura: ${(err as Error).message}`,
    );
  } finally {
    await browser.close();
  }

  return precos;
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
    const combustivelByName = new Map<string, string>();
    for (const c of combustiveis || []) {
      combustivelByName.set(c.nome.toLowerCase(), c.id);
    }

    // Fallback estático: nomes Vibra conhecidos -> nome do combustível no DB.
    const VIBRA_PRODUCT_FALLBACK: Record<string, string> = {
      "óleo diesel b s500": "diesel s500",
      "óleo diesel b s10": "diesel s10",
      "gasolina comum c": "gasolina comum",
      "gasolina comum c adit petrobras grid": "gasolina aditivada",
      "gasolina comum c aditivada": "gasolina aditivada",
      "etanol hidratado combustivel": "etanol",
    };

    // Lê mapeamento extra da env var VIBRA_PRODUCT_MAP (JSON).
    // Config externa sobrescreve/estende o fallback. Ausente ou inválida -> apenas fallback.
    function loadProductMap(): Record<string, string> {
      const map = { ...VIBRA_PRODUCT_FALLBACK };
      const raw = process.env.VIBRA_PRODUCT_MAP;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            Object.assign(map, parsed); // env var vence sobre o fallback
          }
        } catch {
          // JSON malformado: ignora e mantém apenas o fallback estático
        }
      }
      return map;
    }

    // Combustível ID por nome Vibra (lowercase)
    const combustivelMap = new Map<string, string>();
    for (const [vibraNome, dbNome] of Object.entries(loadProductMap())) {
      const id = combustivelByName.get(dbNome.toLowerCase());
      if (id) {
        combustivelMap.set(vibraNome.toLowerCase(), id);
      }
    }

    // Build base abreviacao -> id map for base_id FK lookup
    const { data: basesData } = await supabase
      .from("bases")
      .select("id, abreviacao");
    const baseIdMap: Record<string, string> = {};
    basesData?.forEach((b) => {
      baseIdMap[b.abreviacao] = b.id;
    });

    // Lista de bases ativas usadas para iterar na captura
    const { data: basesAtivas } = await supabase
      .from("bases")
      .select("id, abreviacao")
      .eq("ativo", true);
    const bases = (basesAtivas || []).map((b) => b.abreviacao);

    if (bases.length === 0) {
      await logEtapa(
        "SISTEMA",
        "captura-geral",
        "Nenhuma base ativa cadastrada na tabela 'bases'. Encerrando captura.",
      );
      process.exit(1);
    }

    // Allow filtering by a single posto via --posto=ABREV.
    // "ALL" or empty means all active FILIAL postos.
    const postoArg = process.argv.find((a) => a.startsWith("--posto="));
    const postoFilter = postoArg ? postoArg.split("=")[1] : null;
    const isAllPostos = !postoFilter || postoFilter === "ALL";
    const filteredPostos = isAllPostos
      ? postos || []
      : (postos || []).filter((p) => p.abreviacao === postoFilter);

    const dataArg = process.argv.find((a) => a.startsWith("--data="));
    const dataCaptura = dataArg
      ? dataArg.split("=")[1]
      : new Date().toISOString().slice(0, 10);

    // Deleta precos fonte='vibra' da data selecionada antes de gravar
    const start = `${dataCaptura}T00:00:00.000Z`;
    const end = `${dataCaptura}T23:59:59.999Z`;
    const { error: delError } = await supabase
      .from("cotacoes")
      .delete()
      .eq("fonte", "vibra")
      .gte("data_registro", start)
      .lte("data_registro", end);
    if (delError)
      await logEtapa(
        "SISTEMA",
        "delete",
        `Erro ao deletar preços vibra da data ${dataCaptura}: ${delError.message}`,
      );

    for (const posto of filteredPostos) {
      const precos = await captureForPosto(
        posto.id,
        posto.nome,
        posto.abreviacao,
        bases,
      );

      for (const p of precos) {
        if (!(p.preco > 0 && p.preco < VIBRA_MAX_PRECO)) {
          await logEtapa(
            posto.abreviacao,
            "preco-fora-faixa",
            `Preço fora da faixa: ${p.produto} base ${p.base} R$ ${p.preco.toFixed(4)}`,
          );
          continue;
        }
        const combustivelId = combustivelMap.get(p.produto.toLowerCase());
        if (!combustivelId) {
          await logEtapa(
            posto.abreviacao,
            "nao-mapeado",
            `Produto não mapeado: ${p.produto} (posto ${posto.abreviacao}, base ${p.base})`,
          );
          continue;
        }
        const baseId = baseIdMap[p.base];
        if (!baseId) {
          await logEtapa(
            posto.abreviacao,
            "nao-mapeado",
            `Base não mapeada: ${p.base} (posto ${posto.abreviacao})`,
          );
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

        const now = `${dataCaptura}T00:00:00.000Z`;
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
          const { error: insError } = await supabase
            .from("cotacoes")
            .insert({
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
