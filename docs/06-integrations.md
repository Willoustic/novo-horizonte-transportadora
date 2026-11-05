# 06 - Integracoes Externas

## Vibra (Portal Web)

- Sem API oficial
- Captura automatizada: Playwright (Chromium stealth) faz login SSO + 2FA por email (IMAP Gmail, codigo de verificacao por regex) e extrai precos por base (BAGAM, ARCAB, AISUAP).
- Fluxo de troca de base: aguarda modal "Simulador de Preços" (mat-dialog-title) → captura primeira base (BAGAM, padrão) sem trocar → fecha modal X → abre dropdown (arrow_drop_down) → clica "+" → preenche input base → seleciona primeiro item com Enter → clica "Simular preços" (arrow_forward) → captura → fecha modal. Repete para cada base restante.
- `scripts/vibra-capture.ts`: `--posto=ALL` ou vazio captura todos os postos FILIAIS ativos; `--posto=ABREV` filtra por abreviacao. Loga preços por posto/base. Insere/atualiza `cotacoes` (fonte='vibra') e `historico_precos` (audit). VIBRA_MAX_PRECO e VIBRA_PRODUCT_MAP configuráveis via env.
- `POST /api/vibra/capturar`: deleta lançamentos `fonte='vibra'` da data selecionada antes de disparar o workflow via `workflow_dispatch` (inputs `posto`, `data`).
- `.github/workflows/vibra-capture.yml`: disparo manual via GitHub Actions `workflow_dispatch` ou pela rota da app. Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `VIBRA_EMAIL_USER`, `VIBRA_EMAIL_PASS`.
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
