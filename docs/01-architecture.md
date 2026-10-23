# 01 - Arquitetura e Decisoes Tecnicas

## Stack
- Frontend: Next.js 14+ (App Router) + TypeScript
- UI: Tailwind CSS + shadcn/ui
- Banco/Auth/Storage: Supabase (PostgreSQL + RLS + Auth)
- Tabelas: TanStack Table
- Formularios: React Hook Form + Zod
- Graficos: Recharts
- Deploy: Vercel (Free) + Supabase (Free)

## Padroes
- Monolito Next.js (API Routes + Server Components)
- RLS (Row Level Security) por perfil em todas as tabelas
- Criptografia AES-256 para parametros sensiveis
- Validacao server-side em todas as API routes

## Justificativas
- Next.js monolito: deploy unico, mais rapido para MVP de 7 dias
- Supabase: auth + DB + storage gratuitos, RLS nativo
- Vercel Free: sem configuracao de servidor, deploy via GitHub
- shadcn/ui: componentes acessiveis e customizaveis

## Limitacoes do Free Tier
- Vercel: serverless functions timeout 10s (ok para MVP sem scraping)
- Supabase: pausa apos 7 dias de inatividade (reativa ao acessar)
- Sem SLA
