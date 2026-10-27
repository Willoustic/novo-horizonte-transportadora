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
function decrypt(t) {
  const key = Buffer.from(ENC, "hex");
  const parts = t.split(":");
  if (parts.length !== 3) return t;
  const iv = Buffer.from(parts[0], "hex");
  const tag = Buffer.from(parts[1], "hex");
  const enc = parts[2];
  const d = crypto.createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  let r = d.update(enc, "hex", "utf8");
  r += d.final("utf8");
  return r;
}
(async () => {
  const { data } = await supabase.from("parametros").select("*").eq("grupo", "vibra");
  console.log("PARAMETROS VIBRA:", (data || []).map((p) => p.chave));
  for (const abrev of ["PNH2-ZN", "PNH1-ZS", "VITORIA"]) {
    const loginRow = (data || []).find((p) => p.chave === `vibra_${abrev}_login`);
    const senhaRow = (data || []).find((p) => p.chave === `vibra_${abrev}_senha`);
    const login = loginRow ? decrypt(loginRow.valor) : null;
    const senha = senhaRow ? decrypt(senhaRow.valor) : null;
    console.log(abrev, "login=", login, "senha_len=", senha ? senha.length : 0);
  }
})();