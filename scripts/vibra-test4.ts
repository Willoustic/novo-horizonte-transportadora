import { chromium } from "playwright";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://cn.vibraenergia.com.br/login/logout");
  await page.waitForTimeout(2000);
  await page.fill('input[name="usuario"]', "1108147");
  await page.fill('input[name="senha"]', "Postosul2601");
  await page.click('input[name="btn-acessar"]');
  await page.waitForTimeout(4000);
  console.log("2FA page loaded, polling email...");

  const client = new ImapFlow({
    host: "imap.gmail.com",
    port: 993,
    secure: true,
    auth: { user: "Financeiro@postonovohorizonte.com", pass: "nfuc htxt limm jvdw" },
    logger: false,
  });
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const since = new Date(Date.now() - 2 * 60 * 1000);
    let code: string | null = null;
    for (let i = 0; i < 12; i++) {
      const uids = await client.search({ since }, { uid: true });
      console.log(`attempt ${i + 1}: ${uids.length} messages since 2min`);
      for (const uid of uids) {
        const msg = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
        const subject = msg?.envelope?.subject || "";
        if (!subject.includes("Código de verificação")) continue;
        const parsed = await simpleParser(msg.source!);
        const text = parsed.text || "";
        const m = text.match(/Utilize o código abaixo para concluir sua autenticação no Canal de Negócios:\s*\n?\s*(\d{6})/i);
        if (m) { code = m[1]; break; }
      }
      if (code) break;
      await new Promise((r) => setTimeout(r, 5000));
    }
    console.log("CODE:", code);
    if (code) {
      await page.fill('input[name="codigo"]', code);
      await page.click('input[name="btn-verificar"]');
      await page.waitForTimeout(6000);
      console.log("After verify URL:", page.url());
      await page.screenshot({ path: "C:\\Users\\POSTO NH\\Documents\\GitHub\\Transportadora\\tmp\\vibra-after.png" });
    }
  } finally {
    lock.release();
    await client.logout();
  }
  await page.waitForTimeout(10000);
  await browser.close();
})();
