# Novo Horizonte Transportadora de Combustíveis

Sistema web para controle de pedidos, carregamentos, estoque e cotações
de combustível para 3 postos filiais + postos clientes.

## Stack
- Next.js 14+ (App Router) + TypeScript
- Supabase (PostgreSQL + Auth + Storage)
- Tailwind CSS + shadcn/ui
- Vercel (deploy gratuito)

## Módulos
- **Cadastros**: Postos, Combustíveis, Fornecedores, Motoristas, Cavalos, Tanques de Carreta, Tanques de Posto
- **Pedidos**: Pedidos de combustível com itens, status e histórico
- **Carregamentos**: Carregamentos vinculados a pedidos, status e rastreio
- **Estoque**: Snapshots diários por tanque, alerta de estoque mínimo
- **Empréstimos**: Empréstimos de combustível entre postos
- **Cotações**: Cotações de preço por posto/combustível/fornecedor com histórico
- **Parâmetros**: Configurações do sistema (valores sensíveis criptografados AES-256-GCM)

## Perfis de Acesso
- `admin` — acesso total
- `padrao` — operação padrão
- `restrito` — acesso limitado

## Postos Filiais
- PNH2-ZN
- PNH1-ZS
- VITORIA

## Combustíveis
- GC, GA, DS10, DS500/DC, ET

## Fornecedores
- Vibra, Setta, Larco, Petrovia

## Variáveis de Ambiente
Copie `.env.example` para `.env.local` e preencha:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
ENCRYPTION_KEY=   # 32 bytes em hex (64 caracteres)
```

## Desenvolvimento Local

```bash
npm install
npm run dev
```

## Deploy (Vercel)
1. Criar repositório no GitHub: `novo-horizonte-transportadora`
2. Aplicar migrations no Supabase (`supabase/migrations/`)
3. Configurar env vars na Vercel
4. Deploy via Vercel (conectado ao GitHub)

## Documentação
Ver `Memory.md` e `/docs` para documentação completa.