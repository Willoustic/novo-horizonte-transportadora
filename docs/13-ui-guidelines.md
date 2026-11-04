# 13 - Guia de UI

## Cores

- Primary (Verde): #16a34a (green-600)
- Accent (Amarelo): #eab308 (yellow-500)
- Background: #ffffff / #f9fafb
- Text: #111827 (gray-900)
- Muted: #6b7280 (gray-500)
- Danger: #dc2626 (red-600)
- Success: #16a34a (green-600)

## Tipografia

- Font: Inter (Google Fonts)
- Headings: font-semibold
- Body: font-normal

## Componentes

- shadcn/ui (Button, Input, Table, Dialog, Select, etc.)
- Tabelas densas: TanStack Table
- Formularios: React Hook Form + Zod
- Icones: Lucide React

## Layout

- Sidebar fixa (desktop) / drawer (mobile)
- Header com nome do usuario e perfil
- Breadcrumb em paginas internas
- Responsivo: mobile-first

## Logo

- Componente: `src/components/layout/Logo.tsx`
- Tipo: texto puro, sem imagem (`"NH Transportadora"` em `<span>`)
- Arquivo imagem removido: `public/logo.jfif` deletado
- Uso: `<Logo />` nas telas de login e sidebar (desktop + mobile top bar)
- Sempre usar o componente Logo, nunca hardcodear o nome em outras telas

## Acessibilidade

- Contraste minimo WCAG AA
- Focus visible em todos os elementos interativos
- Labels em todos os inputs

## Estilização de Inputs

- Modo claro: `--input` definido em `--input: 0 0% 100%` (fundo branco, texto preto)
- Modo escuro: `--input` definido em `--input: 0 0% 0%` (fundo preto, texto branco)
- Todas as tag `input`, `select`, `textarea` devem ter as classes explícitas:
  - `bg-white dark:bg-gray-900 text-gray-900 dark:text-white`
- NUNCA usar `next/image` para inputs — apenas elementos de formulário HTML nativo

## Status Badges

- Verde: ok/entregue
- Amarelo: pendente/em andamento
- Vermelho: erro/cancelado
- Melhor preco: fundo verde claro
