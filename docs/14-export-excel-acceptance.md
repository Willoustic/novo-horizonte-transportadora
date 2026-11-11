# 14 - Exportação Excel (XLSX) - Critérios de Aceitação

## Objetivo

Adicionar exportação XLSX 100% client-side no dashboard, com um botão "Exportar Excel" em cada um dos 4 cards (Litragem Pedidos, Carregamento Motorista, Estoque Filial, Melhor Preço Posto), permitindo download dos dados do navegador sem endpoint API nem alteração de banco/Supabase.

## Escopo

- Componente `ExportarExcelButton` em `src/components/dashboard/exportar-excel-button.tsx`
- Serviço `exportarExcel` em `src/services/exportar-excel.service.ts` (biblioteca `xlsx` v0.18.5)
- Botão em cada um dos 4 cards do dashboard (`src/app/(dashboard)/page.tsx`)
- Cada botão exporta apenas os dados do seu card
- Perfis `admin` e `padrao`: operação; perfil `restrito`: não exibe o botão
- Feedback visual via `useState` + `setTimeout` (sem lib de toast externa)
- Cores: verde `#16a34a` (`bg-green-600 text-white hover:bg-green-700`) e amarelo `#eab308`

## Critérios de Aceitação

### CA-01 — Exportação 100% client-side
- [ ] O download é iniciado no navegador (arquivo XLSX salvo localmente)
- [ ] Não há chamada a endpoint API nem alteração de tabelas no Supabase
- [ ] Biblioteca `xlsx` v0.18.5 utilizada para gerar o workbook

### CA-02 — Um botão por card
- [ ] Card "Litragem Pedidos": botão "Exportar Excel" presente
- [ ] Card "Carregamento Motorista": botão "Exportar Excel" presente
- [ ] Card "Estoque Filial": botão "Exportar Excel" presente
- [ ] Card "Melhor Preço Posto": botão "Exportar Excel" presente

### CA-03 — Dados isolados por card
- [ ] Cada botão exporta apenas os dados do seu respectivo card
- [ ] Não há vazamento de dados entre cards

### CA-04 — Controle de acesso por perfil
- [ ] Perfil `admin`: botão visível e operante
- [ ] Perfil `padrao`: botão visível e operante
- [ ] Perfil `restrito`: botão não renderizado (componente retorna `null`)

### CA-05 — Estados de dados
- [ ] Com dados: botão habilitado, exporta corretamente
- [ ] Sem dados: botão desabilitado (`disabled`)

### CA-06 — Feedback visual
- [ ] Sucesso: mensagem "Exportacao concluida com sucesso!" exibida após o clique
- [ ] Erro: mensagem "Erro ao exportar Excel. Tente novamente." exibida em caso de exceção

### CA-07 — Qualidade de código
- [ ] TypeScript strict: `tsc --noEmit` com 0 erros
- [ ] ESLint: sem erros (warnings pré-existentes aceitáveis)
- [ ] Build Next.js: `npm run build` com sucesso
- [ ] Testes vitest: 35/35 passando (8 unitários botão + 9 unitários serviço + 5 integração ponta-a-ponta + demais existentes)
- [ ] Nomes em inglês, componentes PascalCase, arquivos kebab-case
- | Componente: `ExportarExcelButton` | Serviço: `exportarExcel` | Arquivos: `exportar-excel-button.tsx`, `exportar-excel.service.ts`

### CA-08 — Fluxo de entrega
- [ ] Commit em Conventional Commits na branch `feature/exportacao-xlsx-dashboard`
- [ ] PR aberto para master e mergeado
- | Deploy automático na Vercel via push na master (https://nh-transportadora.vercel.app)

## Evidências de Teste

```
Test Files  5 passed (5)
Tests       35 passed (35)
```

- `src/components/dashboard/exportar-excel-button.test.tsx` — 8 testes unitários (mockados)
- `src/services/exportar-excel.service.test.ts` — 9 testes unitários (mockados)
- `src/components/dashboard/exportar-excel.integration.test.tsx` — 5 testes de integração ponta-a-ponta (serviço real, `XLSX.writeFile` spyado)

## Arquivos Envolvidos

| Arquivo | Função |
|---------|--------|
| `src/components/dashboard/exportar-excel-button.tsx` | Componente do botão de exportação |
| `src/services/exportar-excel.service.ts` | Serviço de geração e download XLSX |
| `src/app/(dashboard)/page.tsx` | Dashboard com 4 cards, cada um com seu botão |
| `src/components/dashboard/exportar-excel-button.test.tsx` | Testes unitários do componente |
| `src/services/exportar-excel.service.test.ts` | Testes unitários do serviço |
| `src/components/dashboard/exportar-excel.integration.test.tsx` | Testes de integração ponta-a-ponta |
| `docs/14-export-excel-acceptance.md` | Este documento |
