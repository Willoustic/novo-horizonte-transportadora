# 06 - Integracoes Externas

## Vibra (Portal Web)

- Sem API oficial
- Captura automatizada: Playwright (Chromium stealth) faz login SSO + 2FA por email (IMAP Gmail, codigo de verificacao por regex) e extrai precos por base (BAGAM, ARCAB, AISUAP) via DOM (`table.simulador-table` dentro de `mat-dialog-container:visible`).
- Fluxo de troca de base: aguarda modal "Simulador de Preços" → captura primeira base (BAGAM, padrao) sem trocar → fecha modal X → abre dropdown (arrow_drop_down) → clica "+" → preenche input base → seleciona primeiro item com Enter → clica "Simular preços" (arrow_forward) → captura → fecha modal. Repete para cada base restante.
- `scripts/vibra-capture.ts`: `--posto=ALL` ou vazio captura todos os postos FILIAIS ativos; `--posto=ABREV` filtra por abreviacao. `extractPrices(page, base)` é assincrono e extrai Produto, Base e Preco por linha; Base vem do argumento `base`. Guard/warning quando base retorna zero precos. Insere/atualiza `cotacoes` (fonte='vibra') e `historico_precos` (audit). VIBRA_MAX_PRECO e VIBRA_PRODUCT_MAP configuraveis via env.
- `POST /api/capturar-vibra` (novo, PR #4): executa `npx tsx scripts/vibra-capture.ts` como processo filho. Requer autenticacao (perfis admin/padrao). Aceita corpo opcional `{ "posto": "ABREV" }`. `vercel.json` define `maxDuration: 300` para a rota.
- `POST /api/vibra/capturar` (legado): dispara o workflow GitHub Actions `vibra-capture.yml` via `workflow_dispatch` (inputs `posto`, `data`). Requer `GITHUB_TOKEN`.
- Fallback: entrada manual sempre disponivel.

## WhatsApp

- Mensagens chegam em conversas privadas
- MVP: operador cola mensagem -> parser extrai dados -> aprovacao manual
- Fase 2: WhatsApp Business API (webhook automatico)

## Planilhas

- Importacao one-time de XLSX/CSV (Fase 2)
- Exportacao para Excel mantida (sempre disponivel)

## Gmail (para 2FA Vibra)

- Leitura de caixa de entrada via IMAP
- Extração de codigo de verificacao por regex
- Senha de app armazenada criptografada
