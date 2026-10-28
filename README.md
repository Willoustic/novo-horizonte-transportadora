# Novo Horizonte Transportadora de Combustíveis

Sistema web para controle operacional de combustíveis: pedidos, carregamentos, estoque, empréstimos e cotações, atendendo 3 postos filiais e postos clientes.

## Visão Geral

O sistema centraliza a operação de combustíveis dos postos da rede Novo Horizonte, oferecendo rastreabilidade ponta a ponta: da solicitação de compra (pedido) ao abastecimento nos tanques de posto, passando pelo carregamento, estoque e conciliação de preços via cotações.

## Funcionalidades

- **Cadastros**: postos, combustíveis, fornecedores, motoristas, cavalos, tanques de carreta e tanques de posto.
- **Pedidos**: criação de pedidos com múltiplos itens, status e histórico.
- **Carregamentos**: vinculação a pedidos, status e rastreio.
- **Estoque**: snapshots diários por tanque, alertas de estoque mínimo.
- **Empréstimos**: empréstimos de combustível entre postos.
- **Cotações**: preços por posto/combustível/fornecedor com histórico e melhor preço.
- **Dashboard**: litragem por posto/combustível, melhor preço por posto, carregamentos por motorista e estoque por filial.
- **Parâmetros**: configurações do sistema; valores sensíveis (login/senha Vibra por posto) criptografados com AES-256-GCM.
- **Captura Vibra**: automação de cotações via portal Vibra (Playwright + IMAP para 2FA).
- **Tema claro/escuro**: alternância persistente via `next-themes`.
- **Tabelas**: ordenação por coluna (clique no cabeçalho) e filtro por valores existentes, com scroll responsivo.

## Stack

- **Frontend**: Next.js 14+ (App Router) + TypeScript (strict) + Tailwind CSS + shadcn/ui
- **Tabelas**: TanStack Table
- **Formulários**: React Hook Form + Zod
- **Backend/DB**: Supabase (PostgreSQL + Auth + Storage) com Row Level Security (RLS)
- **Deploy**: Vercel

## Estrutura do Projeto

```
src/
  app/
    (dashboard)/        # páginas autenticadas
    api/                # rotas de API (server-side)
  components/
    cadastros/          # tabelas de cadastros
    shared/             # componentes reutilizáveis (DataTable)
    ui/                 # shadcn/ui
  lib/                  # supabase, crypto
  types/                # tipos TypeScript
supabase/migrations/    # migrations SQL numeradas (001_ a 007_)
scripts/                # automações (vibra-capture)
docs/                   # documentação técnica
```

## Perfis de Acesso

- `admin` — acesso total + gestão de usuários
- `padrao` — operação (pedidos, carregamentos, estoque, cotações)
- `restrito` — acesso limitado

## Postos Filiais

- PNH2-ZN
- PNH1-ZS
- VITORIA

## Combustíveis

GC, GA, DS10, DS500/DC, ET

## Fornecedores

Vibra, Setta, Larco, Petrovia

## Variáveis de Ambiente

Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENCRYPTION_KEY=   # 32 bytes em hex (64 caracteres)
```

## Desenvolvimento Local

```bash
npm install
npm run dev
```

Acesse `http://localhost:3000`.

## Banco de Dados

Aplique as migrations em ordem (nunca pular numeracao em banco ja existente):

```bash
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_seed_data.sql
supabase/migrations/004_add_base_to_cotacoes.sql
supabase/migrations/005_add_pedido_status_values.sql
supabase/migrations/006_add_data_columns.sql
supabase/migrations/007_remove_vibra.sql
```

## Deploy (Vercel)

1. Conectar repositório GitHub à Vercel.
2. Configurar env vars na Vercel.
3. Aplicar migrations no Supabase.
4. Deploy automático a cada push em `master`.

Produção: https://nh-transportadora.vercel.app

## Documentação

Ver `Memory.md` e `/docs` para documentação completa (modelo de dados, regras de negócio, perfis, preços, UI, deploy).
