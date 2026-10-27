const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
function getEnv(k) {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^"|"$/g, "") : null;
}
const URL = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
const ENC = getEnv("ENCRYPTION_KEY");
const supabase = createClient(URL, KEY);
function encrypt(t) {
  const key = Buffer.from(ENC, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(t, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}
(async () => {
  const login = "62635";
  const senha = "Postosul2601";
  const encLogin = encrypt(login);
  const encSenha = encrypt(senha);
  const { error: e1 } = await supabase.from("parametros").update({ valor: encLogin }).eq("grupo", "vibra").eq("chave", "vibra_PNH2-ZN_login");
  const { error: e2 } = await supabase.from("parametros").update({ valor: encSenha }).eq("grupo", "vibra").eq("chave", "vibra_PNH2-ZN_senha");
  if (e1) console.error("login update error:", e1.message);
  else console.log("login updated");
  if (e2) console.error("senha update error:", e2.message);
  else console.log("senha updated");
})();