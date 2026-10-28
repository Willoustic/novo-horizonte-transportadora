# Memory — Novo Horizonte Transportadora de Combustíveis

> Arquivo de memória do projeto. Referencia toda a documentação em /docs.
> Última atualização: 2026-10-23

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

## Status Atual (2026-10-23)

### Feito
- Estrutura de 50 diretórios, configs, 14 docs, Memory.md, Agents.md, README.
- Migrations: schema (18 tabelas), RLS por perfil, seed (3 filiais, 5 combustíveis, 4 fornecedores).
- Cadastros: API + páginas para postos, combustíveis, fornecedores, motoristas, cavalos, tanques-carreta, tanques-posto (soft-delete).
- Parâmetros: API + página com criptografia AES-256-GCM.
- Pedidos: API + página com itens e mudança de status.
- Carregamentos: API + página com status.
- Estoque: API (upsert por data) + página com alerta de mínimo.
- Empréstimos: API + página.
- Cotações: API (histórico de preços) + página.
- Dashboard layout com navegação.
- Type-check (tsc --noEmit) passando.

### Próximo passo
- Deploy: criar repositório GitHub, aplicar migrations no Supabase, configurar env vars e publicar na Vercel.
- Depois: testes E2E e refinamentos de UI (modal de confirmação de preço duplicado, histórico de preços).