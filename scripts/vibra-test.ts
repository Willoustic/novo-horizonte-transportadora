import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://cn.vibraenergia.com.br/login/logout");
  console.log("URL:", page.url());
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "C:\\Users\\POSTO NH\\Documents\\GitHub\\Transportadora\\tmp\\vibra-login.png" });
  console.log("screenshot saved");
  // Try filling
  const inputs = await page.$$("input");
  console.log("inputs count:", inputs.length);
  for (const inp of inputs) {
    const name = await inp.getAttribute("name");
    const fc = await inp.getAttribute("formcontrolname");
    const type = await inp.getAttribute("type");
    console.log("input:", { name, fc, type });
  }
  const buttons = await page.$$("button");
  console.log("buttons:", buttons.length);
  for (const b of buttons) {
    const text = (await b.textContent())?.trim();
    console.log("button:", text);
  }
  await page.waitForTimeout(10000);
  await browser.close();
})();
