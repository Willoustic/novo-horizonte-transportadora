# 08 - Deploy (Vercel + Supabase)

## Frontend + Backend
- Vercel (Free): deploy automatico via GitHub
- Configurar env vars no painel da Vercel

## Banco de Dados + Auth + Storage
- Supabase (Free): PostgreSQL + Auth + Storage
- Migrations em supabase/migrations/
- RLS policies em arquivo separado

## CI/CD
- Push na main -> deploy automatico na Vercel
- Migrations Supabase aplicadas manualmente

## Limitacoes do Free Tier
- Vercel: serverless timeout 10s
- Supabase: pausa apos 7 dias de inatividade
- Sem SLA
