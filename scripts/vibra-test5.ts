import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://cn.vibraenergia.com.br/login/logout");
  await page.waitForTimeout(2000);
  await page.fill('input[name="usuario"]', "1108147");
  await page.fill('input[name="senha"]', "Postosul2601");
  await page.click('input[name="btn-acessar"]');
  await page.waitForTimeout(4000);

  // poll IMAP
  const { ImapFlow } = await import("imapflow");
  const { simpleParser } = await import("mailparser");
  const client = new ImapFlow({ host: "imap.gmail.com", port: 993, secure: true, auth: { user: "Financeiro@postonovohorizonte.com", pass: "nfuc htxt limm jvdw" }, logger: false });
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  let code = null;
  try {
    const since = new Date(Date.now() - 2 * 60 * 1000);
    for (let i = 0; i < 12 && !code; i++) {
      const uids = await client.search({ since }, { uid: true });
      for (const uid of uids) {
        const msg = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
        const subject = msg?.envelope?.subject || "";
        if (!subject.includes("Código de verificação")) continue;
        const parsed = await simpleParser(msg.source!);
        const m = (parsed.text || "").match(/Utilize o código abaixo para concluir sua autenticação no Canal de Negócios:\s*\n?\s*(\d{6})/i);
        if (m) { code = m[1]; break; }
      }
      if (!code) await new Promise((r) => setTimeout(r, 5000));
    }
  } finally { lock.release(); await client.logout(); }

  console.log("CODE:", code);
  await page.fill('input[name="codigo"]', code!);
  await page.click('input[name="btn-verificar"]');
  await page.waitForTimeout(6000);
  console.log("URL:", page.url());
  await page.screenshot({ path: "C:\\Users\\POSTO NH\\Documents\\GitHub\\Transportadora\\tmp\\vibra-after.png" });

  // inspect page
  const inputs = await page.$$("input");
  console.log("inputs:", inputs.length);
  for (const inp of inputs) console.log("input:", await inp.getAttribute("name"), await inp.getAttribute("type"), await inp.getAttribute("id"));
  const buttons = await page.$$("button, input[type=submit], input[type=button], a");
  console.log("buttons/links:", buttons.length);
  for (const b of buttons) {
    const t = (await b.textContent())?.trim();
    if (t) console.log("  ", t.slice(0, 60));
  }

  await page.waitForTimeout(20000);
  await browser.close();
})();
