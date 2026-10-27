import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

(async () => {
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
    const since = new Date(Date.now() - 5 * 60 * 1000);
    const uids = await client.search({ since, seen: false }, { uid: true });
    console.log("unseen uids:", uids);
    for (const uid of uids) {
      const msg = await client.fetchOne(uid, { source: true, envelope: true }, { uid: true });
      console.log("uid", uid, "subject:", msg?.envelope?.subject);
      if (msg?.source) {
        const parsed = await simpleParser(msg.source);
        const text = parsed.text || "";
        const match = text.match(/Utilize o código abaixo para concluir sua autenticação no Canal de Negócios:\s*\n?\s*(\d{6})/i);
        console.log("code match:", match?.[1]);
        if (match) console.log("TEXT SNIPPET:", text.slice(0, 500));
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }
})();
