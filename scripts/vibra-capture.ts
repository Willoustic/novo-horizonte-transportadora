import { chromium } from "playwright-extra";
import type { Page } from "playwright";
import stealth from "puppeteer-extra-plugin-stealth";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";
import fs from "fs";
import path from "path";

chromium.use(stealth());

export function decrypt(encryptedText: string): string {
  const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
  const key = Buffer.from(ENCRYPTION_KEY, "hex");
  const parts = encryptedText.split(":");
  if (parts.length !== 3) return encryptedText;
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Timeout constants (ms)
const TIMEOUT_30S = 30000;
const TIMEOUT_20S = 20000;
const TIMEOUT_10S = 10000;
const TIMEOUT_8S = 8000;
const TIMEOUT_5S = 5000;
const TIMEOUT_3S = 3000;
const TIMEOUT_1_5S = 1500;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 2000;

const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Logger centralizado: todo output de console passa por aqui.
// Credenciais e codigo 2FA nunca sao logados.
async function logEtapa(
  postoAbrev: string,
  etapa: string,
  mensagem: string,
): Promise<void> {
  const agora = new Date().toISOString();
  console.error(`[${postoAbrev}][${etapa}] ${agora} - ${mensagem}`);
}

const EMAIL_HOST = "imap.gmail.com";
const EMAIL_USER = process.env.VIBRA_EMAIL_USER!;
const EMAIL_PASS = process.env.VIBRA_EMAIL_PASS!;

interface VibraPreco {
  produto: string;
  preco: number;
  base: string;
  posto?: string;
}

interface BaseResultado {
  sucesso: boolean;
  preco_count: number;
  erro?: string;
}

interface PostoResultado {
  posto: string;
  nome: string;
  sucesso: boolean;
  total_precos: number;
  bases: Record<string, BaseResultado>;
  precos: VibraPreco[];
  erros: string[];
  portal_indisponivel: boolean;
}

interface CapturaResumo {
  chromia_disponivel: boolean;
  postos_processados: number;
  postos: PostoResultado[];
  total_precos: number;
  bases_com_sucesso: string[];
  bases_com_erro: string[];
  erros_por_base: Record<string, string>;
}

function parsePreco(texto: string): number {
  const limpo = texto
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(/,/g, ".");
  const valor = parseFloat(limpo);
  return Number.isFinite(valor) ? valor : 0;
}

async function getParam(grupo: string, chave: string): Promise<string | null> {
  const { data } = await supabase
    .from("parametros")
    .select("valor")
    .eq("grupo", grupo)
    .eq("chave", chave)
    .single();
  return data?.valor ?? null;
}

async function waitFor2FACode(since: Date): Promise<string | null> {
  const client = new ImapFlow({
    host: EMAIL_HOST,
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
      const sortedUids = (uids || []).sort((a, b) => b - a);
      for (const uid of sortedUids) {
        const msg = (await client.fetchOne(
          uid,
          { source: true },
          { uid: true },
        )) as { source?: Buffer } | false;
        if (!msg || !msg.source) continue;
        const parsed = await simpleParser(msg.source);
        const subject = parsed.subject || "";
        if (
          !subject.includes(
            "Código de verificação para autenticação - Vibra Energia",
          )
        )
          continue;
        const text = parsed.text || "";
        const match = text.match(
          /Utilize o código abaixo para concluir sua autenticação no Canal de Negócios:\s*\n?\s*(\d{6})/i,
        );
        if (match) return match[1];
      }
      await new Promise((r) => setTimeout(r, TIMEOUT_5S));
    }
    return null;
  } finally {
    lock.release();
    await client.logout();
  }
}

export async function extractPrices(
  page: Page,
  base: string,
): Promise<VibraPreco[]> {
  const results: VibraPreco[] = [];
  const dialog = page.locator("mat-dialog-container:visible");
  if ((await dialog.count()) === 0) {
    return results;
  }
  const table = dialog.locator("table.simulador-table");
  if ((await table.count()) === 0) {
    return results;
  }
  const rows = table.locator("tbody tr");
  const rowCount = await rows.count();
  for (let i = 0; i < rowCount; i++) {
    const row = rows.nth(i);
    const produto = (await row.locator("td").nth(0).innerText()).trim();
    const precoTexto = (await row.locator("td").nth(2).innerText()).trim();
    const preco = parsePreco(precoTexto);
    if (produto && preco > 0) {
      results.push({ produto, preco, base });
    }
  }
  return results;
}

/**
 * Verifica se o Chromium esta disponivel antes de tentar launch.
 * Retorna true se o executavel existe, false caso contrario.
 */
async function checkChromiumAvailable(): Promise<boolean> {
  try {
    const exePath = chromium.executablePath();
    await fs.promises.access(exePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Retry com backoff exponencial (2-3 tentativas).
 * Usado para login/2FA e simulacao de precos por base.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: {
    attempts?: number;
    baseDelayMs?: number;
    label?: string;
    logEtapaRef?: (msg: string) => Promise<void>;
  },
): Promise<T> {
  const attempts = opts.attempts ?? RETRY_ATTEMPTS;
  const baseDelay = opts.baseDelayMs ?? RETRY_BASE_DELAY_MS;
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === attempts - 1) break;
      const delay = Math.min(baseDelay * Math.pow(2, i), 15000);
      if (opts.logEtapaRef) {
        await opts.logEtapaRef(
          `Retry ${i + 1}/${attempts} para ${opts.label ?? "operacao"}. Tentando novamente em ${delay}ms.`,
        );
      }
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

async function captureForPosto(
  postoId: string,
  postoNome: string,
  postoAbrev: string,
): Promise<PostoResultado> {
  const resultado: PostoResultado = {
    posto: postoAbrev,
    nome: postoNome,
    sucesso: false,
    total_precos: 0,
    bases: {},
    precos: [],
    erros: [],
    portal_indisponivel: false,
  };

  const log = (etapa: string, msg: string) =>
    logEtapa(postoAbrev, etapa, msg);

  const rawLogin = await getParam("vibra", `vibra_${postoAbrev}_login`);
  const rawSenha = await getParam("vibra", `vibra_${postoAbrev}_senha`);
  const login = rawLogin ? decrypt(rawLogin) : null;
  const senha = rawSenha ? decrypt(rawSenha) : null;
  if (!login || !senha) {
    await log("credenciais", `Credenciais não encontradas para ${postoAbrev}`);
    resultado.erros.push(`credenciais_nao_encontradas:${postoAbrev}`);
    return resultado;
  }

  // T2.2: verifica disponibilidade do Chromium antes de lancar.
  const chromiaDisponivel = await checkChromiumAvailable();
  if (!chromiaDisponivel) {
    await log(
      "chromium",
      "Chromium nao disponivel. Nao eh possivel executar captura com Playwright.",
    );
    resultado.erros.push("chromium_nao_disponivel");
    return resultado;
  }

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "pt-BR",
  });
  const page = await context.newPage();
  const precos: VibraPreco[] = [];

  async function screenshotEtapa(etapa: string): Promise<void> {
    try {
      const tmpDir = path.join(process.cwd(), "tmp");
      fs.mkdirSync(tmpDir, { recursive: true });
      const nomeArquivo = path.join(
        tmpDir,
        `vibra-${postoAbrev}-${etapa}-${Date.now()}.png`,
      );
      await page.screenshot({ path: nomeArquivo, fullPage: true });
      await log(
        postoAbrev,
        `screenshot salvo: ${path.basename(nomeArquivo)}`,
      );
    } catch (e) {
      await log(
        postoAbrev,
        `falha ao salvar screenshot: ${(e as Error).message}`,
      );
    }
  }

  async function diagnosticarErro(etapa: string, motivo: string) {
    try {
      const estado = await page.evaluate(() => ({
        url: window.location.href,
        title: document.title,
        textLen: document.body.textContent?.length ?? 0,
      }));
      await log(
        etapa,
        `DIAGNOSTICO ${motivo}: url=${estado.url} title=${estado.title} textLen=${estado.textLen}`,
      );
    } catch (e) {
      await log(
        etapa,
        `Falha ao capturar diagnostico: ${(e as Error).message}`,
      );
    }
    try {
      await screenshotEtapa(`${etapa}-${motivo}`);
    } catch (e) {
      await log(
        etapa,
        `Falha ao capturar screenshot diagnostico: ${(e as Error).message}`,
      );
    }
  }

  async function waitForEl(selector: string, timeoutMs = 5000) {
    try {
      await page.waitForSelector(selector, { timeout: timeoutMs });
      return await page.$(selector);
    } catch (e) {
      await log(
        "waitForEl",
        `Seletor não encontrado: ${selector} (${(e as Error).message})`,
      );
      return null;
    }
  }

  async function closeModal() {
    const closeBtn = await page.$('i.md-icons:has-text("close")');
    if (closeBtn) {
      await closeBtn.click({ force: true });
      try {
        await page.waitForSelector("mat-dialog-container", {
          state: "hidden",
          timeout: TIMEOUT_10S,
        });
      } catch {
        // Modal pode já estar fechado ou não existir; prossegue.
      }
      await log(postoAbrev, "modal", "modal fechado");
    }
  }

  async function selecionarBase(base: string) {
    await log(`selecionar-base-${base}`, `Abrindo seletor de base para ${base}...`);
    const formField = await waitForEl("div.mat-form-field-flex", 8000);
    if (!formField) {
      throw new Error(
        `form-field de seleção de base não encontrado para ${base}`,
      );
    }
    await formField.click({ force: true });

    const addBtn = await page.$("i.md-icons.adicionar-bases-icon");
    if (addBtn) {
      await addBtn.click({ force: true });
    }

    const input = await page.$("input.mat-autocomplete-trigger");
    if (!input) {
      throw new Error(
        `input.mat-autocomplete-trigger não encontrado para ${base}`,
      );
    }
    await input.fill("");
    await input.type(base, { delay: 100 });

    try {
      await page.waitForSelector(`mat-option:has-text("${base}")`, {
        timeout: TIMEOUT_10S,
      });
    } catch {
      await log(
        `selecionar-base-${base}`,
        `AVISO: mat-option "${base}" não apareceu no dropdown dentro do timeout.`,
      );
    }

    const option = await page.$(`mat-option:has-text("${base}")`);
    if (!option) {
      throw new Error(`mat-option "${base}" não encontrada no dropdown`);
    }
    await option.click({ force: true });

    try {
      await page.waitForFunction(
        (b) => {
          const el = document.querySelector("div.mat-form-field-flex");
          return el?.textContent?.includes(b) ?? false;
        },
        base,
        { timeout: TIMEOUT_10S },
      );
    } catch {
      await log(
        `selecionar-base-${base}`,
        `AVISO: base "${base}" não confirmada no campo de seleção.`,
      );
    }

    const selecionado = await page.$("div.mat-form-field-flex");
    const texto = selecionado ? await selecionado.innerText() : "";
    if (!texto.includes(base)) {
      throw new Error(
        `Base "${base}" não foi selecionada (campo mostra: ${texto.slice(
          0,
          200,
        )})`,
      );
    }
    await log(
      `selecionar-base-${base}`,
      `Base "${base}" selecionada.`,
    );
  }

  async function simularPreços(base: string) {
    await log(`simular-${base}`, `Clicando em 'Simular preços' para ${base}...`);
    const btn = await page.$('button:has-text("Simular preços")');
    if (!btn) {
      throw new Error(`botão "Simular preços" não encontrado para ${base}`);
    }
    await btn.click({ force: true });

    try {
      await page.waitForSelector("mat-dialog-container", {
        state: "visible",
        timeout: TIMEOUT_30S,
      });
      await log(
        `simular-${base}`,
        "Modal 'Simulador de Preços' detectado.",
      );
    } catch (e) {
      await log(
        `simular-${base}`,
        `AVISO: modal não apareceu dentro do timeout: ${(e as Error).message}`,
      );
    }

    try {
      await page.waitForFunction(
        () =>
          document.querySelector(
            "mat-dialog-container table.simulador-table tbody tr",
          ) !== null,
        { timeout: TIMEOUT_30S },
      );
      await log(
        `simular-${base}`,
        "Tabela de preços renderizada no modal.",
      );
    } catch (e) {
      await log(
        `simular-${base}`,
        `AVISO: tabela de preços não renderizada: ${(e as Error).message}`,
      );
    }
  }

  async function captureBase(base: string) {
    await log(
      `4-captura-${base}`,
      `Iniciando captura de preços para a base ${base}...`,
    );
    await screenshotEtapa(`4-captura-${base}-antes`);

    const modalVisivel =
      (await page.locator("mat-dialog-container:visible").count()) > 0;
    if (!modalVisivel) {
      await log(
        `4-captura-${base}`,
        "AVISO: modal 'Simulador de Preços' não está visível para a captura.",
      );
    }

    const prices = await extractPrices(page, base);

    if (prices.length === 0) {
      await log(
        `4-captura-${base}`,
        `ERRO: nenhum preço extraído para a base ${base} (verificar se o modal e a tabela renderizaram).`,
      );
    } else {
      await log(
        `4-captura-${base}`,
        `${prices.length} preço(ões) extraído(s) para a base ${base}.`,
      );
    }
    for (const p of prices) {
      precos.push({ ...p, posto: postoNome });
      await log(
        `4-captura-${base}`,
        `  -> ${p.produto} | Base: ${p.base} | R$ ${p.preco.toFixed(4)}`,
      );
    }
    await screenshotEtapa(`4-captura-${base}-depois`);
    await log(
      `4-captura-${base}`,
      `${prices.length} preço(ões) para a base ${base}`,
    );
    return prices;
  }

  const BASES = ["BAGAM", "ARCAB", "AISUAP"];

  try {
    // T2.4: retry com backoff para login/2FA (etapa 2).
    await retryWithBackoff(
      async () => {
        // Etapa 1 — navegação para o portal
        await log("1-navegacao", "Acessando portal Vibra central-de-pedidos");
        await page.goto(
          "https://cn.vibraenergia.com.br/central-de-pedidos/#/vitrine?simulador=true",
          { waitUntil: "domcontentloaded", timeout: TIMEOUT_30S },
        );
        // T2.3: substituido waitForTimeout fixo por waitForSelector da pagina carregada.
        await page.waitForSelector("body", { state: "visible", timeout: TIMEOUT_10S });
        await log("1-navegacao", `URL atual: ${page.url()}`);
        await screenshotEtapa("1-navegacao");

        // Etapa 2 — login SSO
        const usernameInput = await page.$('input[name="username"]');
        if (usernameInput) {
          await log(
            "2-login-sso",
            "Campo de usuário detectado. Preenchendo credenciais...",
          );
          await page.fill('input[name="username"]', login);
          await page.fill('input[name="password"]', senha);
          await log(
            "2-login-sso",
            "Credenciais preenchidas. Clicando no botão loginBt...",
          );
          await page.click('input[name="loginBt"]');
          // T2.3: aguarda o campo 2FA aparecer (polling + timeout explícito) em vez de waitForTimeout fixo.
          const otpInput = await page.waitForSelector(
            'input[name="otp"], input#otp',
            { timeout: TIMEOUT_20S },
          ).catch(() => null);
          if (!otpInput) {
            throw new Error(
              "Campo OTP nao apareceu apos login dentro do timeout.",
            );
          }
          await log("2-login-sso", `URL após detecção 2FA: ${page.url()}`);
          await screenshotEtapa("2-login-sso-apos-2fa");

          const since = new Date(Date.now() - 300000);
          await log(
            "2-login-sso",
            "Buscando código 2FA por e-mail (IMAP Gmail)...",
          );
          const code = await waitFor2FACode(since);
          if (code) {
            // T2.5: o codigo 2FA NUNCA e logado nem retornado.
            await log(
              "2-login-sso",
              "Código 2FA recebido. Preenchendo campo OTP...",
            );
            const codeInput = await page.$('input[name="otp"], input#otp');
            if (codeInput) {
              await codeInput.fill("");
              await codeInput.type(code, { delay: 100 });
              // T2.3: aguarda o campo refletir o valor digitado em vez de waitForTimeout fixo.
              await page
                .waitForFunction(
                  (el: HTMLInputElement | null) => el?.value.length > 0,
                  codeInput,
                  { timeout: TIMEOUT_5S },
                )
                .catch(() => {});
              await log(
                "2-login-sso",
                "Clicando em mfaValidate para validar 2FA...",
              );
              await page.click('input[name="mfaValidate"]');
              // T2.3: aguarda navegacao/mudanca de URL apos validacao 2FA.
              await page
                .waitForFunction(() => document.readyState === "complete", {
                  timeout: TIMEOUT_10S,
                })
                .catch(() => {});
              await log(
                "2-login-sso",
                `URL após validação 2FA: ${page.url()}`,
              );
              await screenshotEtapa("2-login-sso-apos-2fa");
            } else {
              await log(
                "2-login-sso",
                "AVISO: campo OTP não encontrado no DOM após detecção de 2FA.",
              );
            }
          } else {
            throw new Error(
              "Código 2FA não recebido por e-mail no intervalo de 5 minutos.",
            );
          }
        } else {
          await log(
            "2-login-sso",
            "Campo de usuário não detectado — possivelmente já autenticado.",
          );
        }
      },
      {
        attempts: RETRY_ATTEMPTS,
        label: "login/2FA",
        logEtapaRef: (msg) => log("retry-login", msg),
      },
    );

    // Etapa 3 — fechar modal inicial (se houver)
    await log(
      "3-fechar-modal-inicial",
      "Verificando modal inicial para fechar...",
    );
    const closeBtnInicial = await page.$('i.md-icons:has-text("close")');
    if (closeBtnInicial) {
      await closeBtnInicial.click({ force: true });
      // T2.3: espera o modal sumir em vez de waitForTimeout fixo.
      await page
        .waitForSelector("mat-dialog-container", {
          state: "hidden",
          timeout: TIMEOUT_10S,
        })
        .catch(() => {});
      await log("3-fechar-modal-inicial", "Modal inicial fechado.");
    } else {
      await log(
        "3-fechar-modal-inicial",
        "Nenhum modal inicial detectado.",
      );
    }
    await screenshotEtapa("3-fechar-modal-inicial");

    // Captura uma base por vez, em estado limpo, sem contaminação entre bases.
    // Cada base tem try/catch proprio: uma falha registra o erro e continua.
    // T2.4: retry com backoff para simulacao de precos por base.
    for (const base of BASES) {
      let basePrecos: VibraPreco[] = [];
      let baseErro: string | undefined;

      try {
        await retryWithBackoff(
          async () => {
            // Re-abre o simulador para cada base (estado limpo, sem re-login/2FA)
            await page.goto(
              "https://cn.vibraenergia.com.br/central-de-pedidos/#/vitrine?simulador=true",
              {
                waitUntil: "domcontentloaded",
                timeout: TIMEOUT_30S,
              },
            );
            // T2.3: espera a pagina carregar em vez de waitForTimeout fixo.
            await page.waitForSelector("body", {
              state: "visible",
              timeout: TIMEOUT_10S,
            });
            await closeModal();
            // T2.3: espera o modal fechar em vez de waitForTimeout fixo.
            await page
              .waitForSelector("mat-dialog-container", {
                state: "hidden",
                timeout: TIMEOUT_10S,
              })
              .catch(() => {});

            await selecionarBase(base);
            await simularPreços(base);
            basePrecos = await captureBase(base);
            await closeModal();
          },
          {
            attempts: RETRY_ATTEMPTS,
            label: `simulacao-preco-${base}`,
            logEtapaRef: (msg) => log(`retry-${base}`, msg),
          },
        );
      } catch (err) {
        baseErro = (err as Error).message;
        await log(
          `captura-${base}`,
          `ERRO: ${baseErro}`,
        );
        await diagnosticarErro(`captura-${base}`, base);
        resultado.erros.push(`${base}:${baseErro}`);
      }

      const precoCount = basePrecos.length;
      resultado.bases[base] = {
        sucesso: precoCount > 0,
        preco_count: precoCount,
        ...(baseErro ? { erro: baseErro } : {}),
      };
      resultado.total_precos += precoCount;
    }

    resultado.sucesso = resultado.total_precos > 0;

    // T2.3: PNH2-ZN (e qualquer posto) sem preços = portal indisponível, log explícito.
    if (resultado.total_precos === 0) {
      resultado.portal_indisponivel = true;
      await log(
        "portal",
        `portal indisponível para este posto: ${postoAbrev} (zero preços capturados nas bases ${BASES.join(
          ", ",
        )})`,
      );
    }

    await log(
      `captura-geral`,
      `Captura do posto ${postoAbrev} concluída. Total: ${resultado.total_precos} preço(ões).`,
    );
  } catch (err) {
    await log(
      "captura-geral",
      `Erro na captura: ${(err as Error).message}`,
    );
    resultado.erros.push(`erro_geral:${(err as Error).message}`);
  } finally {
    await browser.close();
  }

  resultado.precos = precos;
  return resultado;
}

/**
 * Insere ou atualiza uma cotacao (fonte='vibra') e grava auditoria em
 * historico_precos. Respeita o UNIQUE (posto_id, combustivel_id, fornecedor_id, base_id).
 * preco_anterior e preco_novo sao NOT NULL: quando nao existe cotacao previa,
 * usa o proprio preco novo como valor inicial (registro de criacao).
 */
async function salvarCotacaoEHistorico(
  postoId: string,
  fornecedorId: string | undefined,
  combustivelMap: Map<string, string>,
  baseIdMap: Record<string, string>,
  preco: VibraPreco,
): Promise<void> {
  if (!fornecedorId) {
    await logEtapa(
      "SISTEMA",
      "cotacao",
      "Fornecedor Vibra não encontrado; pulando inserção de cotação.",
    );
    return;
  }

  const combustivelId = combustivelMap.get(preco.produto.toLowerCase());
  const baseId = baseIdMap[preco.base];
  if (!combustivelId || !baseId) {
    await logEtapa(
      "SISTEMA",
      "cotacao",
      `Combustível ou base não mapeado para produto="${preco.produto}" base="${preco.base}"; pulando.`,
    );
    return;
  }

  const agora = new Date().toISOString();

  // Busca cotação existente (no máximo uma por UNIQUE constraint).
  const { data: existente } = await supabase
    .from("cotacoes")
    .select("id, preco")
    .eq("posto_id", postoId)
    .eq("combustivel_id", combustivelId)
    .eq("fornecedor_id", fornecedorId)
    .eq("base_id", baseId)
    .single();

  const precoAnterior = existente?.preco ?? preco.preco;
  let cotacaoId = existente?.id ?? null;

  if (existente && cotacaoId) {
    // Atualiza cotação existente.
    await supabase
      .from("cotacoes")
      .update({
        preco: preco.preco,
        fonte: "vibra",
        ativo: true,
        data_registro: agora,
      })
      .eq("id", cotacaoId);
  } else {
    // Insere nova cotação.
    const { data: nova } = await supabase
      .from("cotacoes")
      .insert({
        posto_id: postoId,
        combustivel_id: combustivelId,
        fornecedor_id: fornecedorId,
        base_id: baseId,
        preco: preco.preco,
        fonte: "vibra",
        anexo_url: null,
        data_registro: agora,
        registrado_por: null,
        ativo: true,
      })
      .select("id")
      .single();
    cotacaoId = nova?.id ?? null;
  }

  // Auditoria: registra a alteração (ou criação) do preço.
  if (cotacaoId) {
    await supabase.from("historico_precos").insert({
      cotacao_id: cotacaoId,
      preco_anterior: precoAnterior,
      preco_novo: preco.preco,
      fonte: "vibra",
      data_alteracao: agora,
      alterado_por: null,
    });
  }
}

async function main() {
  const resumo: CapturaResumo = {
    chromia_disponivel: false,
    postos_processados: 0,
    postos: [],
    total_precos: 0,
    bases_com_sucesso: [],
    bases_com_erro: [],
    erros_por_base: {},
  };

  try {
    // T2.2: verifica Chromium uma vez antes de processar postos.
    resumo.chromia_disponivel = await checkChromiumAvailable();
    if (!resumo.chromia_disponivel) {
      await logEtapa(
        "SISTEMA",
        "chromium",
        "Chromium nao disponível. Captura abortada.",
      );
    }

    const { data: postos } = await supabase
      .from("postos")
      .select("id, nome, abreviacao")
      .eq("tipo", "FILIAL")
      .eq("ativo", true);

    const { data: fornecedorVibra } = await supabase
      .from("fornecedores")
      .select("id")
      .or("tipo.eq.vibra,nome.ilike.%vibra%")
      .limit(1)
      .single();
    const fornecedorId = fornecedorVibra?.id;

    const { data: combustiveis } = await supabase
      .from("combustiveis")
      .select("id, nome")
      .eq("ativo", true);
    const combustivelMap = new Map<string, string>();
    for (const c of combustiveis || []) {
      combustivelMap.set(c.nome.toLowerCase(), c.id);
    }
    // Map Vibra product names to DB combustivel names
    combustivelMap.set(
      "óleo diesel b s500",
      combustivelMap.get("diesel s500")!,
    );
    combustivelMap.set("óleo diesel b s10", combustivelMap.get("diesel s10")!);
    combustivelMap.set(
      "gasolina comum c",
      combustivelMap.get("gasolina comum")!,
    );
    combustivelMap.set(
      "gasolina comum c adit petrobras grid",
      combustivelMap.get("gasolina aditivada")!,
    );
    combustivelMap.set(
      "gasolina comum c aditivada",
      combustivelMap.get("gasolina aditivada")!,
    );
    combustivelMap.set(
      "etanol hidratado combustivel",
      combustivelMap.get("etanol")!,
    );

    // Build base abreviacao -> id map for base_id FK lookup
    const { data: basesData } = await supabase
      .from("bases")
      .select("id, abreviacao");
    const baseIdMap: Record<string, string> = {};
    basesData?.forEach((b) => {
      baseIdMap[b.abreviacao] = b.id;
    });

    // Allow filtering by a single posto via --posto=ABREV.
    // "ALL" or empty means all active FILIAL postos.
    const postoArg = process.argv.find((a) => a.startsWith("--posto="));
    const postoFilter = postoArg ? postoArg.split("=")[1] : null;
    const isAllPostos = !postoFilter || postoFilter === "ALL";
    const filteredPostos = isAllPostos
      ? postos || []
      : (postos || []).filter((p) => p.abreviacao === postoFilter);

    resumo.postos_processados = filteredPostos.length;

    for (const posto of filteredPostos) {
      const postoResultado = await captureForPosto(
        posto.id,
        posto.nome,
        posto.abreviacao,
      );
      resumo.postos.push(postoResultado);
      resumo.total_precos += postoResultado.total_precos;

      // Agrega bases com sucesso/erro ao resumo global.
      for (const [base, br] of Object.entries(postoResultado.bases)) {
        if (br.sucesso) {
          if (!resumo.bases_com_sucesso.includes(base)) {
            resumo.bases_com_sucesso.push(base);
          }
        } else {
          if (!resumo.bases_com_erro.includes(base)) {
            resumo.bases_com_erro.push(base);
          }
          if (br.erro) {
            resumo.erros_por_base[base] = br.erro;
          }
        }
      }

      // Insere/atualiza cotacoes e gravacao de auditoria historico_precos
      // para cada preco capturado do posto.
      for (const p of postoResultado.precos) {
        await salvarCotacaoEHistorico(
          posto.id,
          fornecedorId,
          combustivelMap,
          baseIdMap,
          p,
        );
      }
    }

    await logEtapa("SISTEMA", "concluido", "Concluído.");
  } catch (e) {
    await logEtapa("SISTEMA", "captura-geral", `Erro: ${(e as Error).message}`);
    process.exit(1);
  }

  // T2.6: resumo estruturado impresso em stdout (JSON) para o endpoint parsear.
  // Todo log de diagnostico vai para stderr (console.error) e nao contamina o stdout.
  console.log(JSON.stringify(resumo));
}

main().catch(async (e) => {
  await logEtapa("SISTEMA", "captura-geral", `Erro: ${(e as Error).message}`);
  process.exit(1);
});
