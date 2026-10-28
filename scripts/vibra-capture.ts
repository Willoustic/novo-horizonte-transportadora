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

    // BAGAM (padrão) — aguardar base field aparecer no DOM
    await page.waitForTimeout(3000);
    await waitForEl('div.mat-form-field-flex', 5000).then(() => page.waitForTimeout(1000));
    await captureBase("BAGAM");
    await closeModal();

    async function switchBaseAndCapture(baseName: string) {
      await logEtapa(`5-troca-base-${baseName}`, `Iniciando troca de base para ${baseName}...`);

      // Garantir que não reste modal aberto da base anterior
      await logEtapa(`5-troca-base-${baseName}`, "Fechando modal remanescente da base anterior (se houver)...");
      await closeModal();
      await screenshotEtapa(`5-troca-base-${baseName}-apos-fechar-modal`);

      // Clicar no form field para abrir selector
      await logEtapa(`5-troca-base-${baseName}`, "Aguardando e clicando no form field de seleção de base...");
      const formField = await waitForEl('div.mat-form-field-flex', 5000);
      if (!formField) {
        const diag = await page.evaluate(() => ({
          url: window.location.href,
          title: document.title,
          textLen: document.body.innerText.length,
          text: document.body.innerText.replace(/\s+/g, " ").slice(0, 500),
        }));
        await logEtapa(`5-troca-base-${baseName}`, `ERRO: form-field não encontrado para ${baseName}`);
        await logEtapa(`5-troca-base-${baseName}`, `Diagnóstico | url=${diag.url} title=${diag.title} textLen=${diag.textLen}`);
        await logEtapa(`5-troca-base-${baseName}`, `Texto da página: ${diag.text}`);
        await screenshotEtapa(`5-troca-base-${baseName}-erro-form-field`);
        return;
      }
      await formField.click({ force: true });
      await page.waitForTimeout(2000);
      await logEtapa(`5-troca-base-${baseName}`, "Form field clicado.");

      // Clicar no +
      const addBtn = await page.$('i.md-icons.adicionar-bases-icon');
      if (addBtn) {
        await addBtn.click({ force: true });
        await page.waitForTimeout(2000);
        await logEtapa(`5-troca-base-${baseName}`, "Botão '+' (adicionar bases) clicado.");
      } else {
        await logEtapa(`5-troca-base-${baseName}`, "AVISO: botão '+' não encontrado.");
      }

      // Digitar base
      const input = await page.$('input.mat-autocomplete-trigger');
      if (!input) {
        await logEtapa(`5-troca-base-${baseName}`, "ERRO: input.mat-autocomplete-trigger não encontrado.");
        await screenshotEtapa(`5-troca-base-${baseName}-erro-input`);
        return;
      }
      await input.fill("");
      await input.type(baseName, { delay: 100 });
      await page.waitForTimeout(2000);
      await logEtapa(`5-troca-base-${baseName}`, `Base "${baseName}" digitada no autocomplete.`);

      // Selecionar opção
      const option = await page.$(`mat-option:has-text("${baseName}")`);
      if (option) {
        await option.click({ force: true });
        await page.waitForTimeout(2000);
        await logEtapa(`5-troca-base-${baseName}`, `Opção "${baseName}" selecionada no dropdown.`);
      } else {
        await logEtapa(`5-troca-base-${baseName}`, `AVISO: mat-option "${baseName}" não encontrada no dropdown.`);
      }

      // Simular preços
      await logEtapa(`5-troca-base-${baseName}`, "Aguardando simulador de preços aparecer e clicando em 'Simular preços'...");
      const simularBtn = await page.$('button:has-text("Simular preços")');
      if (simularBtn) {
        await simularBtn.click({ force: true });
        await page.waitForTimeout(5000);
        await logEtapa(`5-troca-base-${baseName}`, "Botão 'Simular preços' clicado. Aguardando 5s para o simulador renderizar...");
        await screenshotEtapa(`5-troca-base-${baseName}-apos-simular`);
      } else {
        await logEtapa(`5-troca-base-${baseName}`, "AVISO: botão 'Simular preços' não encontrado.");
      }

      await captureBase(baseName);
      await closeModal();
      await logEtapa(`5-troca-base-${baseName}`, `Troca de base para ${baseName} concluída e modal fechado.`);
    }

    // BAGAM (padrão) — aguardar base field aparecer no DOM
    await logEtapa("4-captura-BAGAM", "Aguardando base field aparecer no DOM para BAGAM...");
    await page.waitForTimeout(3000);
    await waitForEl('div.mat-form-field-flex', 5000).then(() => page.waitForTimeout(1000));
    await captureBase("BAGAM");
    await closeModal();
    await logEtapa("4-captura-BAGAM", "Captura BAGAM concluída e modal fechado.");

    await switchBaseAndCapture("ARCAB");
    await switchBaseAndCapture("AISUAP");
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
      const { data: existing } = await supabase
        .from("cotacoes")
        .select("id, preco")
        .eq("posto_id", posto.id)
        .eq("combustivel_id", combustivelId)
        .eq("fornecedor_id", fornecedorId)
        .eq("base", p.base)
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
          .update({ preco: p.preco, fonte: "vibra", data_registro: now, base: p.base })
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
          base: p.base,
        });
        if (insError) console.error(`Erro insert ${p.base}:`, insError.message);
      }
    }
  }

  console.log("Concluído.");
}

main().catch((e) => { console.error(e); process.exit(1); });
