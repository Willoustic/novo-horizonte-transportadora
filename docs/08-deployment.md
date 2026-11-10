# 08 - Deploy (Vercel + Supabase)

## Visao geral

- Frontend + API: Vercel (Free), deploy automatico via push na branch `master` (GitHub).
- Banco/Auth/Storage: Supabase (Free), PostgreSQL + Auth + Storage.
- Producao: https://nh-transportadora.vercel.app
- Repositorio: https://github.com/Willoustic/novo-horizonte-transportadora.git

## Variaveis de ambiente

Nunca commitar valores reais. `.env*` esta no `.gitignore`. Copie `.env.example` para `.env.local` em desenvolvimento.

### Para o `.env.local` (dev local — nunca commitar)

| Variavel                      | Origem                                                                     | Obs                                     |
| ----------------------------- | -------------------------------------------------------------------------- | --------------------------------------- |
| NEXT_PUBLIC_SUPABASE_URL      | Supabase Dashboard > Settings > API                                        | URL do projeto                          |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase Dashboard > Settings > API                                        | Anon key (public)                       |
| SUPABASE_SERVICE_ROLE_KEY     | Supabase Dashboard > Settings > API                                        | **Segredo.** Server-side only (scripts e rota /api/capturar-vibra) |
| ENCRYPTION_KEY                | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | AES-256-GCM, 64 hex chars. Obrigatório para descriptografar credenciais da Vibra. |
| NEXT_PUBLIC_APP_URL           | http://localhost:3000 (dev)                                                | Base URL da app                         |
| VIBRA_EMAIL_USER              | Segredo do e-mail Gmail (IMAP)                                             | Usado pelo script de captura para 2FA   |
| VIBRA_EMAIL_PASS              | Segredo da senha de app Gmail                                              | Usado pelo script de captura para 2FA   |
| GITHUB_TOKEN                  | GitHub > Settings > Developer settings > Personal access tokens            | PAT com acesso a Actions (repo)         |
| GITHUB_REPO_OWNER             | Willoustic                                                                 | Dono do repo                            |
| GITHUB_REPO_NAME              | novo-horizonte-transportadora                                              | Nome do repo                            |

### Para o Vercel (Painel > Project > Settings > Environment Variables)

Producao e Preview:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (necessario para a rota `/api/capturar-vibra` executar o script de captura)
- `ENCRYPTION_KEY` (necessario para descriptografar credenciais da Vibra)
- `NEXT_PUBLIC_APP_URL` = `https://nh-transportadora.vercel.app`
- `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME` (necessarios para a rota `/api/vibra/capturar` disparar o workflow)

Na Vercel, o arquivo `vercel.json` define `maxDuration: 300` (5 minutos) para a rota `src/app/api/capturar-vibra/route.ts`, pois a captura via Playwright é demorada.

Nao adicionar `SUPABASE_SERVICE_ROLE_KEY` ao Vercel a menos que uma rota server-side precise dela; e nao expor credenciais em responses ou logs.

### Para secrets do GitHub (repositorio > Settings > Secrets and variables > Actions)

Usados pelo workflow `.github/workflows/vibra-capture.yml`:

- `ENCRYPTION_KEY`
- `SUPABASE_URL` (mapeado para `NEXT_PUBLIC_SUPABASE_URL` no workflow)
- `SUPABASE_SERVICE_ROLE_KEY`
- `VIBRA_EMAIL_USER` (usuario Gmail IMAP — lido de variável de ambiente pelo script)
- `VIBRA_EMAIL_PASS` (senha de app Gmail — lido de variável de ambiente pelo script)

## Migrations do Supabase (aplicacao manual)

Migrations estao em `supabase/migrations/` (numeradas: 001_ a 007_, sem gaps). Aplicar em ordem; em banco existente, nao pular numeracao.

Opcao A — Supabase CLI:

```
npx supabase login
npx supabase link --project-ref <projeto-ref>
npx supabase db push
```

Opcao B — SQL Editor (Supabase Dashboard):

1. Abrir Supabase Dashboard > SQL Editor.
2. Executar os arquivos em ordem: `001_initial_schema.sql`, `002_rls_policies.sql`, `003_seed_data.sql`, `004_add_base_to_cotacoes.sql`, `005_add_pedido_status_values.sql`, `006_add_data_columns.sql`, `007_remove_vibra.sql`.
3. Verificar RLS ativo em todas as tabelas (perfil admin/padrao/restrito).

Sempre aplicar RLS. Nao pular migrations.

## vibra-capture (captura de precos)

### Endpoint direto `POST /api/capturar-vibra` (PR #4)

Executa `npx tsx scripts/vibra-capture.ts` como processo filho no servidor. Requer autenticacao (perfis `admin` ou `padrao`). Aceita corpo opcional `{ "posto": "ABREV" }` para filtrar por posto. Configurado em `vercel.json` com `maxDuration: 300`.

Variaveis de ambiente necessarias no servidor (Vercel ou local): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`.

### GitHub Actions (alternativa/legado)

Workflow `.github/workflows/vibra-capture.yml` presente e testado via `workflow_dispatch`. Disparo:

1. GitHub > Actions > vibra-capture > Run workflow.
2. Informar `posto` (abreviacao, ex: VIT, ZN) ou deixar vazio/`ALL` para todos os postos FILIAIS ativos.
3. Informar `data` (YYYY-MM-DD) opcional: a rota `POST /api/vibra/capturar` deleta lançamentos `fonte='vibra'` dessa data antes de disparar a captura.
4. A rota `POST /api/vibra/capturar` tambem dispara o workflow via `GITHUB_TOKEN` + `workflow_dispatch`.

Comportamento do script `scripts/vibra-capture.ts`:

- `--posto=ALL` ou vazio = todos os postos FILIAIS ativos (nao filtra por abreviacao "ALL").
- `--posto=ABREV` = filtra por abreviacao do posto.
- Loga preços capturados por posto e base.
- Insere/atualiza `cotacoes` (fonte='vibra') e grava `historico_precos` (audit de alteracao de preco).

Segredos necessarios no repo GitHub (lista acima): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, `VIBRA_EMAIL_USER`, `VIBRA_EMAIL_PASS`. Configurar como secrets do GitHub Actions. Nao commitar credenciais.

Producao: https://nh-transportadora.vercel.app (deploy automatico a cada push em `master`).

> Limite do Vercel Free: serverless + Playwright/Chromium pode não funcionar em produção sem Chromium instalado. Validar a captura em ambiente com Chromium disponível antes de depender do endpoint direto.

## Procedimentos locais (dev)

1. `cp .env.example .env.local` e preencher valores reais (nenhum commita).
2. `npm install`
3. `npm run dev` — http://localhost:3000
4. `npm run lint`
5. `npm run build` (verificar antes de push)
6. Captura manual de precos Vibra: `npm run vibra:capture` (usa `.env.local`; opcional `--posto=ABREV`).

## Producao

- URL: https://nh-transportadora.vercel.app
- Deploy automatico a cada push em `master` via integracao Vercel-GitHub.
- Migrations aplicadas manualmente antes/depois do deploy, conforme necessario.
- Nao ha SLA no free tier (Vercel serverless timeout 10s; Supabase pausa apos 7 dias sem atividade).

## Checklist de deploy

- [ ] `.env.example` atualizado com todas as variaveis necessarias
- [ ] Variaveis do Vercel configuradas (producao + preview)
- [ ] Secrets do GitHub Actions configurados
- [ ] Workflow `.github/workflows/vibra-capture.yml` presente e testado via `workflow_dispatch`
- [ ] Migrations aplicadas no Supabase de producao
- [ ] RLS ativo em todas as tabelas
- [ ] Nenhum segredo real em `.env.example` nem commitado
