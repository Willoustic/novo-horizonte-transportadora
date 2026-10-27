const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const env = fs.readFileSync(".env.local", "utf8");
function getEnv(k) {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^"|"$/g, "") : null;
}
const supabase = createClient(getEnv("NEXT_PUBLIC_SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
(async () => {
  const { data: cols, error: ce } = await supabase.from("parametros").select("*").limit(1);
  console.log("sample row keys:", Object.keys(cols?.[0] || {}));
  console.log("ce:", ce?.message);
  const res = await supabase.from("parametros").update({ valor: "TEST" }).eq("grupo", "vibra").eq("chave", "vibra_PNH2-ZN_login").select();
  console.log("update result:", JSON.stringify(res, null, 2));
})();