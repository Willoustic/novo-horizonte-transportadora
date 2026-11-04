# Ledger SDD — Plano 01-vibra-preco-por-base

BASE: 6b6d872 (master)
Plan: docs/planos/01-vibra-preco-por-base.md
Worktree: transportadora-vibra-worktree (branch wt/vibra-preco)

## Tarefas

| # | Tarefa | Status | Base commit | HEAD | Notas |
|---|--------|--------|-------------|------|-------|
| 1 | Bases dinâmicas do Supabase | concluída | 6b6d872 | | Remover BASES hardcoded, ler da tabela bases. Aprovado pelo reviewer. |
| 2 | Vínculo base × preço na extração | concluída | 6b6d872 | | extractPrices retorna base extraída do texto; captureBase usa p.base. Aprovado pelo reviewer. |
| 3 | Mapeamento de produtos configurável | concluída | 6b6d872 | | env var VIBRA_PRODUCT_MAP JSON com fallback estático; prioridade externa > estático. Aprovado pelo reviewer. |
| 4 | Log de não mapeados | concluída | 6b6d872 | | logEtapa "nao-mapeado" para produto/base não mapeados; fluxo continua. Aprovado pelo reviewer. |
| 5 | Faixa de preço plausível | concluída | 6b6d872 | | Validar 0 < preço < 10000 antes de gravar. Aprovado pelo reviewer. |
| 6 | Repasse de `data` da rota para o script/workflow | concluída | 6b6d872 | | Rota envia data no workflow_dispatch; workflow passa --data; script lê, deleta e grava com dataCaptura. Aprovado pelo reviewer. |

## Regras do ledger

- Uma tarefa só é marcada "concluída" após implementação + revisão do task reviewer + testes verdes.
- Em caso de fix loop, a tarefa volta para "em andamento" até passar na revisão.
- GATE 1 (plan) aprovado: sim (plano definido acima).
- GATE 2 (commit) pendente até todas as tarefas concluídas e revisadas.
