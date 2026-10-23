# Agents — Novo Horizonte Transportadora

## Contexto do Projeto
Sistema web para controle de pedidos, carregamentos, estoque e cotações
de combustível. 3 postos filiais + postos clientes.

## Antes de Qualquer Ação
1. Leia Memory.md para contexto geral.
2. Consulte o doc específico em /docs conforme a tarefa.
3. Siga as convenções abaixo.

## Convenções de Código

### Geral
- TypeScript strict mode
- ESLint + Prettier
- Nomes de variáveis/funções em inglês
- UI em português (BR)
- Componentes em PascalCase, arquivos em kebab-case

### Estrutura
- Páginas: src/app/(dashboard)/{modulo}/page.tsx
- API: src/app/api/{modulo}/route.ts
- Componentes: src/components/{modulo}/
- Serviços: src/services/{modulo}.service.ts
- Types: src/types/

### Banco de Dados
- Migrations em supabase/migrations/ (numeradas: 001_, 002_, ...)
- RLS policies em arquivo separado (002_rls_policies.sql)
- Seed data em 003_seed_data.sql
- Sempre usar RLS (Row Level Security) por perfil

### UI
- Cores: verde (#16a34a) e amarelo (#eab308)
- Componentes: shadcn/ui (não criar do zero)
- Tabelas densas: TanStack Table
- Formulários: React Hook Form + Zod
- Responsivo: mobile-first

### Segurança
- Credenciais de Parâmetros: sempre criptografadas (AES-256)
- Nunca expor credenciais em logs ou responses
- RLS em todas as tabelas
- Validação server-side em todas as API routes

## Perfis de Acesso
- admin: tudo + gestão de usuários
- padrao: operação (pedidos, carregamentos, estoque, cotações)
- restrito: sem acesso

## Fluxo de Trabalho
1. Spec → Planning → Implementation → Review → Deploy
2. Commits: Conventional Commits
3. Branch: feature/{nome}, fix/{nome}
4. PR obrigatório antes de merge na main

## Referência Rápida de Docs
| Preciso de... | Arquivo |
|---------------|---------|
| Schema do banco | docs/02-data-model.md |
| Regras de negócio | docs/03-business-rules.md |
| Perfis de acesso | docs/05-roles-permissions.md |
| Regras de preços | docs/10-pricing-rules.md |
| Guia de UI | docs/13-ui-guidelines.md |
| Deploy | docs/08-deployment.md |