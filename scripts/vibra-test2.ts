import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto("https://cn.vibraenergia.com.br/login/logout");
  await page.waitForTimeout(2000);
  await page.fill('input[name="usuario"]', "1108147");
  await page.fill('input[name="senha"]', "Postosul2601");
  await page.click('input[name="btn-acessar"]');
  await page.waitForTimeout(6000);
  await page.screenshot({ path: "C:\\Users\\POSTO NH\\Documents\\GitHub\\Transportadora\\tmp\\vibra-2fa.png" });
  console.log("URL:", page.url());
  const inputs = await page.$$("input");
  console.log("inputs:", inputs.length);
  for (const inp of inputs) {
    console.log("input:", await inp.getAttribute("name"), await inp.getAttribute("type"), await inp.getAttribute("id"));
  }
  const buttons = await page.$$("button, input[type=submit], input[type=button]");
  console.log("buttons:", buttons.length);
  for (const b of buttons) {
    console.log("btn:", await b.getAttribute("value"), (await b.textContent())?.trim());
  }
  await page.waitForTimeout(15000);
  await browser.close();
})();
