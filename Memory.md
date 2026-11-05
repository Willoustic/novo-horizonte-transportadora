# Memory — Novo Horizonte Transportadora de Combustíveis

> Arquivo de memória do projeto. Referencia toda a documentação em /docs.
> Última atualização: 2026-11-05

## Visão Geral

Sistema web para controle de pedidos, carregamentos, estoque e cotações
de combustível para 3 postos filiais + postos clientes.

Cores: Verde (#16a34a) e Amarelo (#eab308)
Stack: Next.js + Supabase + Vercel
Hospedagem: Gratuita (Vercel Free + Supabase Free)

## Índice de Documentação

### Contexto e Arquitetura

- [00-overview.md](docs/00-overview.md) — Visão geral e contexto do negócio
- [01-architecture.md](docs/01-architecture.md) — Arquitetura, stack e decisões técnicas
- [08-deployment.md](docs/08-deployment.md) — Guia de deploy (Vercel + Supabase)

### Dados e Regras

- [02-data-model.md](docs/02-data-model.md) — Schema do banco e entidades
- [03-business-rules.md](docs/03-business-rules.md) — Regras de negócio
- [05-roles-permissions.md](docs/05-roles-permissions.md) — Perfis e permissões

### Módulos e Funcionalidades

- [04-modules.md](docs/04-modules.md) — Descrição de cada módulo
- [09-parameters.md](docs/09-parameters.md) — Tela de Parâmetros
- [10-pricing-rules.md](docs/10-pricing-rules.md) — Regras de preços e comparação
- [13-ui-guidelines.md](docs/13-ui-guidelines.md) — Guia de UI (cores, componentes)

### Integrações e Roadmap

- [06-integrations.md](docs/06-integrations.md) — Vibra, WhatsApp, planilhas
- [07-roadmap.md](docs/07-roadmap.md) — Roadmap e fases
- [11-spreadsheet-mapping.md](docs/11-spreadsheet-mapping.md) — Mapeamento planilha → sistema
- [12-changelog.md](docs/12-changelog.md) — Changelog

## Postos Filiais

1. PNH2-ZN — Posto Novo Horizonte e Comércio Derivados de Petróleo
2. PNH1-ZS — Posto Transportes e Comércio Novo Horizonte
3. VITORIA — Posto Vitória LTDA

## Combustíveis

GC (Gasolina Comum), GA (Gasolina Aditivada), DS10 (Diesel S10),
DS500/DC (Diesel S500), ET (Etanol)

## Fornecedores Iniciais

Vibra, Setta, Larco, Petrovia

## Perfis de Acesso

- admin: gestão de usuários + todas as funcionalidades
- padrao: funcionalidades operacionais
- restrito: sem acesso

## Convenções

- Idioma do código: inglês (variáveis, funções, tabelas)
- Idioma da UI: português (BR)
- Idioma de resposta do assistente: sempre português (BR)
- Commits: Conventional Commits (feat:, fix:, docs:, etc.)
- Branch principal: master

## Status Atual (2026-10-28)

### Feito

- Estrutura de 50 diretórios, configs, 14 docs, Memory.md, Agents.md, README.
- Migrations: schema (18 tabelas), RLS por perfil, seed (3 filiais, 5 combustíveis, 4 fornecedores). Migrações 001-008 aplicadas no Supabase (ref qbltinupgfalplieohwv).
- Cadastros: API + páginas para postos, combustíveis, fornecedores, motoristas, cavalos, tanques-carreta, tanques-posto (soft-delete).
- Parâmetros: API + página com criptografia AES-256-GCM.
- Pedidos: API + página com itens e mudança de status.
- Carregamentos: API + página com status.
- Estoque: API (upsert por data) + página com alerta de mínimo.
- Empréstimos: API + página.
- Cotações: API (histórico de preços) + página com filtros posto/combustível/fornecedor e data em dd/mm/yyyy hh:mm:ss.
- Dashboard: "Melhor preço por posto" agrupado por posto×combustível×base (menor preço).
- Type-check (tsc --noEmit) passando.
- Commit 7dbb0f2 pushado ao GitHub master.
- Deploy de produção na Vercel: dpl_9iZnP8bP8Zmx4f8V5ReZ76a1K19n, READY, https://nh-transportadora.vercel.app

### Correções aplicadas (2026-11-04, branch feature/db-backend-migrations-009-011)

- src/app/api/emprestimos/route.ts: valida `data` por regex antes do .or() (evita injeção de filtro PostgREST).
- src/app/api/pedidos/[id]/route.ts: GET inclui fornecedor e base nos itens; PUT remove bloqueio 400 de `data_entrega` (coluna inexistente).
- src/app/api/cotacoes/route.ts: base_id vazio '' tratado como null (evita violação de FK).
- src/app/api/cotacoes/[id]/route.ts: GET inclui base:bases(nome,abreviacao).
- src/app/(dashboard)/{pedidos,carregamentos,cotacoes}/page.tsx: setBases com .catch(() => []); fetchData() awaited após POST/PUT/DELETE (sem dado estale).
- supabase/migrations/009 e 011: tabela auditoria_base_migracao arquiva valores de base/base_origem fora da seed antes do DROP COLUMN (sem perda irreversível).
- scripts/vibra-capture.ts: try/catch por iteração de base (falha numa base não aborta as demais); simularPreços usa baseline de texto antes do click (não captura preço de base cached/errada); diagnóstico (url/title/text) + screenshot nos erros.

### Correções aplicadas (2026-11-05) — PR #4 (mergeado em master)

- `scripts/vibra-capture.ts`: reescrito com extração DOM-based por base (`mat-dialog-container:visible > table.simulador-table`) substituindo regex de texto do corpo. `extractPrices(page, base)` assíncrono, recebe `base` como argumento; `VibraPreco.posto` opcional. `ENCRYPTION_KEY` lido dentro de `decrypt` (leitura em nível de módulo causava falha nos testes pelo tempo de injeção do `vitest.setup.ts`). Guard/warning quando uma base retorna zero preços. Try/catch por iteração de base (falha numa base não aborta as demais); diagnóstico + screenshot nos erros.
- Testes vitest: 15 testes passando (2 arquivos). `tsc --noEmit`: sem erros. Prettier aplicado.
- Novo endpoint `POST /api/capturar-vibra`: executa `npx tsx scripts/vibra-capture.ts` como processo filho; autenticado (perfis admin/padrao); filtro opcional `posto` no corpo; credenciais AES-256-GCM do Supabase, nunca expostas em logs/responses.
- `vercel.json`: `maxDuration: 300` para a rota de captura. `.env.example` com variáveis de ambiente (sem segredos reais). Workflow CI `.github/workflows/ci.yml` adicionado.
- Branch `fix/vibra-preco-por-base` (commit 7ce4ba1) pushada ao origin; PR #4 mergeado em master (commit a5a66a6).

### Próximo passo

- Configurar Vercel environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`.
- Testar `/api/capturar-vibra` a partir do portal (botão "Capturar Vibra" já conectado ao novo endpoint).
- Limitação conhecida: Vercel serverless + Playwright/Chromium pode não rodar em produção; validar captura em ambiente com Chromium instalado.
- PNH2-ZN Vibra capture: portal não renderiza tabela de preços (problema de conta/portal Vibra, não de código).
