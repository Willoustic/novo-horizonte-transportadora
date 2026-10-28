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

  try {
    await page.goto("https://cn.vibraenergia.com.br/central-de-pedidos/#/vitrine?simulador=true", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    if (await page.$('input[name="username"]')) {
      console.log("Login SSO...");
      await page.fill('input[name="username"]', login);
      await page.fill('input[name="password"]', senha);
      await page.click('input[name="loginBt"]');
      await page.waitForTimeout(3000);
      console.log("Aguardando 10s para 2FA...");
      await page.waitForTimeout(10000);
      const since = new Date(Date.now() - 300000);
      const code = await waitFor2FACode(since);
      if (code) {
        const codeInput = await page.$('input[name="otp"], input#otp');
        if (codeInput) {
          await codeInput.fill("");
          await codeInput.type(code, { delay: 100 });
          await page.waitForTimeout(1000);
          await page.click('input[name="mfaValidate"]');
          await page.waitForTimeout(10000);
        }
      }
    }

    // Fechar modal
    const closeBtn = await page.$('i.md-icons:has-text("close")');
    if (closeBtn) {
      await closeBtn.click({ force: true });
      await page.waitForTimeout(2000);
    }

    async function captureBase(base: string) {
      const bodyText = await page.evaluate(() => document.body.innerText);
      const prices = extractPrices(bodyText);
      for (const p of prices) {
        const preco = parseFloat(p.preco.replace(/\./g, "").replace(",", "."));
        if (preco > 0) {
          precos.push({ produto: p.produto, preco, base, posto: postoNome });
        }
      }
      console.log(`  ${base}: ${prices.length} preços`);
    }

    // BAGAM (padrão)
    await page.waitForTimeout(3000);
    await captureBase("BAGAM");

    async function switchBaseAndCapture(baseName: string) {
      // Clicar no form field para abrir selector
      const formField = await page.$('div.mat-form-field-flex');
      if (!formField) { console.log("form-field não encontrado"); return; }
      await formField.click({ force: true });
      await page.waitForTimeout(2000);

      // Clicar no +
      const addBtn = await page.$('i.md-icons.adicionar-bases-icon');
      if (addBtn) {
        await addBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }

      // Digitar base
      const input = await page.$('input.mat-autocomplete-trigger');
      if (!input) { console.log("input não encontrado"); return; }
      await input.fill("");
      await input.type(baseName, { delay: 100 });
      await page.waitForTimeout(2000);

      // Selecionar opção
      const option = await page.$(`mat-option:has-text("${baseName}")`);
      if (option) {
        await option.click({ force: true });
        await page.waitForTimeout(2000);
      }

      // Simular preços
      const simularBtn = await page.$('button:has-text("Simular preços")');
      if (simularBtn) {
        await simularBtn.click({ force: true });
        await page.waitForTimeout(5000);
      }

      await captureBase(baseName);
    }

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

  // Allow filtering by a single posto via --posto=ABREV
  const postoArg = process.argv.find((a) => a.startsWith("--posto="));
  const postoFilter = postoArg ? postoArg.split("=")[1] : null;
  const filteredPostos = postoFilter
    ? (postos || []).filter((p) => p.abreviacao === postoFilter)
    : (postos || []);

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
