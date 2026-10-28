# 12 - Changelog

## [0.1.1] - 2026-10-28
### Adicionado
- Filtros de tabela em /cotacoes (posto, combustível, fornecedor, fonte) via DataTable
- Coluna Data em dd/mm/yyyy hh:mm:ss (formatDateTimeBR)
- Dashboard "Melhor preço por posto" agrupado por posto×combustível×base
### Corrigido
- DataTable canFilter agora lê enableColumnFilter em vez de accessorKey (colunas accessorFn renderizam filtro)
### Implantação
- Commit 7dbb0f2 no GitHub master
- Deploy de produção na Vercel: dpl_9iZnP8bP8Zmx4f8V5ReZ76a1K19n, https://nh-transportadora.vercel.app

## [0.1.0] - 2026-10-23
### Adicionado
- Estrutura inicial do projeto
- Memory.md, Agents.md, README.md
- Documentacao completa em /docs (14 arquivos)
- Estrutura de pastas (src/, supabase/, public/, scripts/)
- .env.example com variaveis de ambiente
