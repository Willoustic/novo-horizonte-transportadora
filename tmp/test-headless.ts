import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://cn.vibraenergia.com.br/login/logout", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(5000);
  console.log("URL:", page.url());
  const inputs = await page.$$("input");
  console.log("inputs count:", inputs.length);
  for (const inp of inputs) {
    console.log("input:", await inp.getAttribute("name"), await inp.getAttribute("type"));
  }
  await page.screenshot({ path: "C:\\Users\\POSTO NH\\Documents\\GitHub\\Transportadora\\tmp\\hl.png" });
  await browser.close();
})();
EOF