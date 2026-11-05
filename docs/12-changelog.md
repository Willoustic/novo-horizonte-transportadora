# 12 - Changelog

## [0.1.3] - 2026-11-05

### Adicionado

- Fluxo de troca de base por dropdown no `scripts/vibra-capture.ts`: `arrow_drop_down` → `+` → `input base` → `Enter` (primeiro item), substituindo `mat-option:has-text` (não encontrava opção).
- Captura primeira base (BAGAM padrão) sem trocar; bases restantes (ARCAB, AISUAP) usam o fluxo de dropdown.
- Aguarda modal "Simulador de Preços" (mat-dialog-title), fecha X após captura, clica "Simular preços" (arrow_forward) e aguarda renderização real do corpo antes de extrair preços.
- Env vars `VIBRA_MAX_PRECO` e `VIBRA_PRODUCT_MAP` configuráveis para filtro de preço e mapeamento de produtos.
- Testes vitest de `decrypt` e `extractPrices`: 12/12 passando.

### Corrigido

- `scripts/vibra-capture.ts`: troca de base não encontrava opção via `mat-option:has-text`; reescrito para seletor de input + Enter. try/catch por iteração de base (falha numa base não aborta as demais); diagnóstico (url/title/text) + screenshot nos erros.

### Implantação

- Commit `f421eec` no GitHub master.

## [0.1.2] - 2026-10-28

### Adicionado

- `POST /api/vibra/capturar` deleta lançamentos `fonte='vibra'` da data selecionada antes de disparar o workflow de captura Vibra.
- Workflow `.github/workflows/vibra-capture.yml` recebe inputs `posto` e `data` via `workflow_dispatch`.
- Log de preços capturados por posto e base em `scripts/vibra-capture.ts`.
- Deploy de produção na Vercel: `dpl_GCUNqXwoD2nKQwoCsMacpAn3EnJm`, https://nh-transportadora.vercel.app.

### Corrigido

- `scripts/vibra-capture.ts`: `--posto=ALL` (ou vazio) captura todos os postos FILIAIS ativos; nao filtra mais por abreviacao "ALL". `--posto=ABREV` filtra por abreviacao.
- Fluxo ponta-a-ponta verificado: workflow run `40748438489` (conclusion=success) capturou os 3 postos (PNH2-ZN, PNH1-ZS, VITORIA); `cotacoes` tem precos `fonte='vibra'` (2026-10-27 presente; 2026-10-28 = 0, sem emails de preco hoje).

### Implantação

- Commits `b127af1` e `7362be6` no GitHub master.

## [0.1.1] - 2026-10-28

### Adicionado

- Filtros de tabela em /cotacoes (posto, combustível, fornecedor, fonte) via DataTable
- Coluna Data em dd/mm/yyyy hh:mm:ss (formatDateTimeBR)
- Dashboard "Melhor preço por posto" agrupado por posto×combustível×base

### Corrigido

- DataTable canFilter agora lê enableColumnFilter em vez de accessorKey (colunas accessorFn renderizam filtro)

### Implantação

- Commit 7dbb0f2 no GitHub master
- Deploy de produção na Vercel: dpl_9iZnP8bP8Zmx4f8V5ReZ76a1K19n, https://nh-transportadora.vercel.app

## [0.1.0] - 2026-10-23

### Adicionado

- Estrutura inicial do projeto
- Memory.md, Agents.md, README.md
- Documentacao completa em /docs (14 arquivos)
- Estrutura de pastas (src/, supabase/, public/, scripts/)
- .env.example com variaveis de ambiente
