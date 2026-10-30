import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

chromium.use(stealth());

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
function decrypt(encryptedText: string): string {
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
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
const msg = await client.fetchOne(uid, { source: true }, { uid: true }) as { source?: Buffer } | false;
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const subject = parsed.subject || "";
        if (!subject.includes("Código de verificação para autenticação - Vibra Energia")) continue;
        const text = parsed.text || "";
        const match = text.match(/Utilize o código abaixo para concluir sua autenticação no Canal de Negócios:\s*\n?\s*(\d{6})/i);
        if (match) return match[1];
      }
      await new Promise((r) => setTimeout(r, 5000));
    }
    return null;
  } finally {
    lock.release();
    await client.logout();
  }
}

function extractPrices(bodyText: string): { produto: string; preco: string }[] {
  const results: { produto: string; preco: string }[] = [];
  const regex = /([A-ZÁÉÍÓÚÃÕÇ][A-ZÁÉÍÓÚÃÕÇ\s\d]+?)\s*\n\s*COD:\d+\s*\n\s*Base:\s*\n\s*(\w+)\s*\n\s*Preço:\s*R\$\s*([\d.,]+)/g;
  let m;
  while ((m = regex.exec(bodyText)) !== null) {
    results.push({ produto: m[1].trim(), preco: m[3] });
  }
  return results;
}

async function captureForPosto(postoId: string, postoNome: string, postoAbrev: string): Promise<VibraPreco[]> {
  const rawLogin = await getParam("vibra", `vibra_${postoAbrev}_login`);
  const rawSenha = await getParam("vibra", `vibra_${postoAbrev}_senha`);
  const login = rawLogin ? decrypt(rawLogin) : null;
  const senha = rawSenha ? decrypt(rawSenha) : null;
  if (!login || !senha) {
    console.error(`Credenciais não encontradas para ${postoAbrev}`);
    return [];
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu", "--window-size=1920,1080"],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "pt-BR",
  });
  const page = await context.newPage();
  const precos: VibraPreco[] = [];

  // Log explícito de cada etapa para debug no console
  async function logEtapa(etapa: string, mensagem: string): Promise<void> {
    const agora = new Date().toISOString();
    console.log(`[${postoAbrev}][${etapa}] ${agora} - ${mensagem}`);
  }

  async function screenshotEtapa(etapa: string): Promise<void> {
    try {
      const nomeArquivo = `tmp/vibra-${postoAbrev}-${etapa}-${Date.now()}.png`;
      await page.screenshot({ path: nomeArquivo, fullPage: true });
      console.log(`[${postoAbrev}][${etapa}] screenshot salvo: ${nomeArquivo}`);
    } catch (e) {
      console.log(`[${postoAbrev}][${etapa}] falha ao salvar screenshot: ${(e as Error).message}`);
    }
  }

  try {
    // Etapa 1 — navegação para o portal
    await logEtapa("1-navegacao", "Acessando portal Vibra central-de-pedidos");
    await page.goto("https://cn.vibraenergia.com.br/central-de-pedidos/#/vitrine?simulador=true", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);
    await logEtapa("1-navegacao", `URL atual: ${page.url()}`);
    await screenshotEtapa("1-navegacao");

    // Etapa 2 — login SSO
    if (await page.$('input[name="username"]')) {
      await logEtapa("2-login-sso", "Campo de usuário detectado. Preenchendo credenciais...");
      await page.fill('input[name="username"]', login);
      await page.fill('input[name="password"]', senha);
      await logEtapa("2-login-sso", "Credenciais preenchidas. Clicando no botão loginBt...");
      await page.click('input[name="loginBt"]');
      await page.waitForTimeout(3000);
      await logEtapa("2-login-sso", "Aguardando 20s para o campo 2FA aparecer (não aparece imediatamente)...");
      await page.waitForTimeout(20000);
      await logEtapa("2-login-sso", `URL após espera 2FA: ${page.url()}`);
      await screenshotEtapa("2-login-sso-apos-espera");

      const since = new Date(Date.now() - 300000);
      await logEtapa("2-login-sso", "Buscando código 2FA por e-mail (IMAP Gmail)...");
      const code = await waitFor2FACode(since);
      if (code) {
        await logEtapa("2-login-sso", `Código 2FA recebido: ${code}. Preenchendo campo OTP...`);
        const codeInput = await page.$('input[name="otp"], input#otp');
        if (codeInput) {
          await codeInput.fill("");
          await codeInput.type(code, { delay: 100 });
          await page.waitForTimeout(1000);
          await logEtapa("2-login-sso", "Clicando em mfaValidate para validar 2FA...");
          await page.click('input[name="mfaValidate"]');
          await page.waitForTimeout(10000);
          await logEtapa("2-login-sso", `URL após validação 2FA: ${page.url()}`);
          await screenshotEtapa("2-login-sso-apos-2fa");
        } else {
          await logEtapa("2-login-sso", "AVISO: campo OTP não encontrado no DOM após 20s de espera.");
        }
      } else {
        await logEtapa("2-login-sso", "ERRO: código 2FA não recebido por e-mail no intervalo de 5 minutos.");
      }
    } else {
      await logEtapa("2-login-sso", "Campo de usuário não detectado — possivelmente já autenticado.");
    }

    // Etapa 3 — fechar modal inicial (se houver)
    await logEtapa("3-fechar-modal-inicial", "Verificando modal inicial para fechar...");
    const closeBtnInicial = await page.$('i.md-icons:has-text("close")');
    if (closeBtnInicial) {
      await closeBtnInicial.click({ force: true });
      await page.waitForTimeout(2000);
      await logEtapa("3-fechar-modal-inicial", "Modal inicial fechado.");
    } else {
      await logEtapa("3-fechar-modal-inicial", "Nenhum modal inicial detectado.");
    }
    await screenshotEtapa("3-fechar-modal-inicial");

    async function captureBase(base: string) {
      await logEtapa(`4-captura-${base}`, `Iniciando captura de preços para a base ${base}...`);
      await screenshotEtapa(`4-captura-${base}-antes`);
      const bodyText = await page.evaluate(() => document.body.innerText);
      const prices = extractPrices(bodyText);
      for (const p of prices) {
        const preco = parseFloat(p.preco.replace(/\./g, "").replace(",", "."));
        if (preco > 0) {
          precos.push({ produto: p.produto, preco, base, posto: postoNome });
        }
      }
      await logEtapa(`4-captura-${base}`, `${prices.length} preço(ões) extraído(s) para a base ${base}.`);
      for (const p of prices) {
        const preco = parseFloat(p.preco.replace(/\./g, "").replace(",", "."));
        if (preco > 0) {
          await logEtapa(`4-captura-${base}`, `  -> ${p.produto} | Base: ${base} | R$ ${preco.toFixed(4)}`);
        }
      }
      await screenshotEtapa(`4-captura-${base}-depois`);
      console.log(`  ${base}: ${prices.length} preços`);
    }

    async function waitForEl(selector: string, timeoutMs = 5000) {
      try {
        await page.waitForSelector(selector, { timeout: timeoutMs });
        return await page.$(selector);
      } catch {
        return null;
      }
    }

    async function closeModal() {
      const closeBtn = await page.$('i.md-icons:has-text("close")');
      if (closeBtn) {
        await closeBtn.click({ force: true });
        await page.waitForTimeout(2000);
        console.log("  modal fechado");
      }
    }

    const BASES = ["BAGAM", "ARCAB", "AISUAP"];

    async function selecionarBase(base: string) {
      await logEtapa(`selecionar-base-${base}`, `Abrindo seletor de base para ${base}...`);
      const formField = await waitForEl('div.mat-form-field-flex', 8000);
      if (!formField) {
        throw new Error(`form-field de seleção de base não encontrado para ${base}`);
      }
      await formField.click({ force: true });
      await page.waitForTimeout(1500);

      const addBtn = await page.$('i.md-icons.adicionar-bases-icon');
      if (addBtn) {
        await addBtn.click({ force: true });
        await page.waitForTimeout(1500);
      }

      const input = await page.$('input.mat-autocomplete-trigger');
      if (!input) {
        throw new Error(`input.mat-autocomplete-trigger não encontrado para ${base}`);
      }
      await input.fill("");
      await input.type(base, { delay: 100 });
      await page.waitForTimeout(1500);

      const option = await page.$(`mat-option:has-text("${base}")`);
      if (!option) {
        throw new Error(`mat-option "${base}" não encontrada no dropdown`);
      }
      await option.click({ force: true });
      await page.waitForTimeout(1500);

      // Verifica se a base foi realmente selecionada antes de simular
      const selecionado = await page.$('div.mat-form-field-flex');
      const texto = selecionado ? await selecionado.innerText() : "";
      if (!texto.includes(base)) {
        throw new Error(`Base "${base}" não foi selecionada (campo mostra: ${texto})`);
      }
      await logEtapa(`selecionar-base-${base}`, `Base "${base}" selecionada.`);
    }

    async function simularPreços(base: string) {
      await logEtapa(`simular-${base}`, `Clicando em 'Simular preços' para ${base}...`);
      const btn = await page.$('button:has-text("Simular preços")');
      if (!btn) {
        throw new Error(`botão "Simular preços" não encontrado para ${base}`);
      }
      await btn.click({ force: true });
      await page.waitForTimeout(3000);
      // Aguarda o simulador renderizar preços para essa base (poll, não sono fixo longo)
      const deadline = Date.now() + 30000;
      let ultimoTexto = "";
      while (Date.now() < deadline) {
        const corpo = await page.evaluate(() => document.body.innerText);
        if (corpo !== ultimoTexto && /R\$\s*[\d.,]+/.test(corpo)) {
          await logEtapa(`simular-${base}`, "Preços renderizados para a base.");
          return;
        }
        ultimoTexto = corpo;
        await page.waitForTimeout(1500);
      }
      await logEtapa(`simular-${base}`, "AVISO: tempo esgotado aguardando preços (prosseguindo com captura).");
    }

    // Captura uma base por vez, em estado limpo, sem contaminação entre bases.
    for (const base of BASES) {
      await logEtapa(`captura-${base}`, `Iniciando captura isolada da base ${base}...`);
      // Re-abre o simulador para cada base (estado limpo, sem re-login/2FA)
      await page.goto("https://cn.vibraenergia.com.br/central-de-pedidos/#/vitrine?simulador=true", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await page.waitForTimeout(3000);
      await closeModal();
      await page.waitForTimeout(1000);

      await selecionarBase(base);
      await simularPreços(base);
      await captureBase(base);
      await closeModal();
      await logEtapa(`captura-${base}`, `Captura isolada da base ${base} concluída.`);
    }
  } catch (err) {
    console.error("Erro na captura:", err);
  } finally {
    await browser.close();
  }

  return precos;
}

async function main() {
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
  combustivelMap.set("óleo diesel b s500", combustivelMap.get("diesel s500")!);
  combustivelMap.set("óleo diesel b s10", combustivelMap.get("diesel s10")!);
  combustivelMap.set("gasolina comum c", combustivelMap.get("gasolina comum")!);
  combustivelMap.set("gasolina comum c adit petrobras grid", combustivelMap.get("gasolina aditivada")!);
  combustivelMap.set("gasolina comum c aditivada", combustivelMap.get("gasolina aditivada")!);
  combustivelMap.set("etanol hidratado combustivel", combustivelMap.get("etanol")!);

  // Build base abreviacao -> id map for base_id FK lookup
  const { data: basesData } = await supabase.from("bases").select("id, abreviacao");
  const baseIdMap: Record<string, string> = {};
  basesData?.forEach((b) => { baseIdMap[b.abreviacao] = b.id; });

  // Allow filtering by a single posto via --posto=ABREV.
  // "ALL" or empty means all active FILIAL postos.
  const postoArg = process.argv.find((a) => a.startsWith("--posto="));
  const postoFilter = postoArg ? postoArg.split("=")[1] : null;
  const isAllPostos = !postoFilter || postoFilter === "ALL";
  const filteredPostos = isAllPostos
    ? (postos || [])
    : (postos || []).filter((p) => p.abreviacao === postoFilter);

  for (const posto of filteredPostos) {
    console.log(`Capturando preços para ${posto.nome}...`);
    const precos = await captureForPosto(posto.id, posto.nome, posto.abreviacao);
    console.log(`Capturados ${precos.length} preços para ${posto.abreviacao}`);
    for (const p of precos) {
      console.log(`${posto.abreviacao} | ${p.base} | ${p.produto} | R$ ${p.preco.toFixed(4)}`);
    }

    for (const p of precos) {
      const combustivelId = combustivelMap.get(p.produto.toLowerCase());
      if (!combustivelId) {
        console.warn(`Combustível não mapeado: ${p.produto}`);
        continue;
      }
      const baseId = baseIdMap[p.base];
      if (!baseId) {
        console.warn(`Base não encontrada no mapa: ${p.base}`);
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
        const { error: histError } = await supabase.from("historico_precos").insert({
          cotacao_id: existing.id,
          preco_anterior: existing.preco,
          preco_novo: p.preco,
          fonte: "vibra",
        });
        if (histError) console.error(`Erro histórico ${p.base}:`, histError.message);
        const { error: updError } = await supabase
          .from("cotacoes")
          .update({ preco: p.preco, fonte: "vibra", data_registro: now, base_id: baseId })
          .eq("id", existing.id);
        if (updError) console.error(`Erro update ${p.base}:`, updError.message);
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
        if (insError) console.error(`Erro insert ${p.base}:`, insError.message);
      }
    }
  }

  console.log("Concluído.");
}

main().catch((e) => { console.error(e); process.exit(1); });
