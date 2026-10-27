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

    console.log("Página carregada. URL:", page.url());
    await page.waitForTimeout(5000);

    // Dump all <i> elements
    const allI = await page.$$eval("i", els => els.map(e => ({ cls: e.className, text: e.textContent?.trim() })));
    console.log("ALL_I:", JSON.stringify(allI));

    // Dump elements containing BAGAM
    const bagamEls = await page.$$eval("*", els => els.map(e => e.textContent?.trim()).filter(t => t && t.includes("BAGAM")));
    console.log("BAGAM_TEXTS:", JSON.stringify(bagamEls));

    // Dump all inputs
    const allInputs = await page.$$eval("input", els => els.map(e => ({ id: e.id, ph: e.placeholder, cls: e.className })));
    console.log("ALL_INPUTS:", JSON.stringify(allInputs));

    // Dump all buttons
    const allBtns = await page.$$eval("button", els => els.map(e => e.textContent?.trim()).filter(Boolean));
    console.log("ALL_BUTTONS:", JSON.stringify(allBtns));

    await page.screenshot({ path: "C:\\Users\\POSTO NH\\Documents\\GitHub\\Transportadora\\tmp\\vibra-debug.png" });
    console.log("Screenshot salvo");
  } catch (err) {
    console.error("Erro:", err);
  } finally {
    await browser.close();
  }
})();
