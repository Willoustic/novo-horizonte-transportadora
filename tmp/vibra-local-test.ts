import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

chromium.use(stealth());

const LOGIN = "1108147";
const SENHA = "Postosul2601";
const EMAIL_USER = "Financeiro@postonovohorizonte.com";
const EMAIL_PASS = "nfuc htxt limm jvdw";

async function waitFor2FACode(since: Date): Promise<string | null> {
  const client = new ImapFlow({
    host: "imap.gmail.com",
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
      const sortedUids = (uids || []).sort((a: number, b: number) => b - a);
      for (const uid of sortedUids) {
        const msg = await client.fetchOne(uid, { source: true }, { uid: true });
        if (!msg?.source) continue;
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

function extractPrices(bodyText: string, base: string): { produto: string; preco: string }[] {
  const results: { produto: string; preco: string }[] = [];
  const regex = /([A-ZÁÉÍÓÚÃÕÇ][A-ZÁÉÍÓÚÃÕÇ\s\d]+?)\s*\n\s*COD:\d+\s*\n\s*Base:\s*\n\s*(\w+)\s*\n\s*Preço:\s*R\$\s*([\d.,]+)/g;
  let m;
  while ((m = regex.exec(bodyText)) !== null) {
    results.push({ produto: m[1].trim(), preco: m[3] });
  }
  return results;
}

(async () => {
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

  try {
    await page.goto("https://cn.vibraenergia.com.br/central-de-pedidos/#/vitrine?simulador=true", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    if (await page.$('input[name="username"]')) {
      console.log("Login SSO...");
      await page.fill('input[name="username"]', LOGIN);
      await page.fill('input[name="password"]', SENHA);
      await page.click('input[name="loginBt"]');
      await page.waitForTimeout(3000);
      console.log("Aguardando 45s para 2FA...");
      await page.waitForTimeout(45000);
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
      console.log("Modal fechado");
    }

    // BAGAM (padrão) - já carregado
    await page.waitForTimeout(3000);
    let bodyText = await page.evaluate(() => document.body.innerText);
    console.log("\n========== BAGAM ==========");
    const bagamPrices = extractPrices(bodyText, "BAGAM");
    for (const p of bagamPrices) console.log(`  ${p.produto}: R$ ${p.preco}`);

    async function switchBaseAndCapture(baseName: string) {
      console.log(`\n========== Trocando para ${baseName} ==========`);

      // Clicar no div mat-form-field-flex para abrir o selector
      const formField = await page.$('div.mat-form-field-flex');
      if (!formField) {
        console.log("mat-form-field-flex não encontrado");
        return;
      }
      await formField.click({ force: true });
      await page.waitForTimeout(2000);
      console.log("Clicou no form field");

      // Clicar no +
      const addBtn = await page.$('i.md-icons.adicionar-bases-icon');
      if (addBtn) {
        await addBtn.click({ force: true });
        await page.waitForTimeout(2000);
        console.log("Clicou no +");
      }

      // Digitar a base
      const input = await page.$('input.mat-autocomplete-trigger');
      if (!input) {
        console.log("Input não encontrado");
        return;
      }
      await input.fill("");
      await input.type(baseName, { delay: 100 });
      await page.waitForTimeout(2000);

      // Selecionar a opção
      const option = await page.$(`mat-option:has-text("${baseName}")`);
      if (option) {
        await option.click({ force: true });
        await page.waitForTimeout(2000);
        console.log(`Selecionou ${baseName}`);
      }

      // Simular preços
      const simularBtn = await page.$('button:has-text("Simular preços")');
      if (simularBtn) {
        await simularBtn.click({ force: true });
        await page.waitForTimeout(5000);
        console.log("Clicou em Simular preços");
      }

      bodyText = await page.evaluate(() => document.body.innerText);
      const prices = extractPrices(bodyText, baseName);
      console.log(`\n--- Preços ${baseName} ---`);
      if (prices.length === 0) console.log("  Nenhum preço extraído");
      for (const p of prices) console.log(`  ${p.produto}: R$ ${p.preco}`);
    }

    await switchBaseAndCapture("ARCAB");
    await switchBaseAndCapture("AISUAP");

    await page.screenshot({ path: "C:\\Users\\POSTO NH\\Documents\\GitHub\\Transportadora\\tmp\\vibra-final.png" });
  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await browser.close();
  }
})();
