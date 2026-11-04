# Task Brief — Tarefa 1

Plano: docs/planos/01-vibra-preco-por-base.md
Tarefa: 1 — Bases dinâmicas do Supabase
Base commit: 6b6d872

## Contexto
scripts/vibra-capture.ts linha 406 define `BASES = ["BAGAM", "ARCAB", "AISUAP"]` hardcoded. A tabela `bases` do Supabase já contém estas 3 bases (migration 009) com colunas id, abreviacao, nome, ativo.

## O que fazer
- Remover a constante `BASES` hardcoded.
- Buscar bases ativas da tabela `bases` no Supabase (select id, abreviacao where ativo = true).
- Iterar sobre as bases retornadas em vez da lista hardcoded.
- Se não houver bases cadastradas/ativas, logar erro e encerrar a captura (não continuar com lista vazia).
- Manter o baseIdMap já existente (linhas 608-614) para lookup de base_id.
- Manter o loop por posto e por base existente, apenas trocar a fonte da lista de bases.

## Critérios de aceitação
- Não existe mais `BASES = [...]` hardcoded no script.
- A lista de bases capturadas vem da tabela `bases` (apenas ativas).
- Se a tabela estiver vazia, o script loga erro e encerra com código de erro.
- base_id de cada preço vem do baseIdMap preenchido da tabela bases.

## Arquivos afetados
- scripts/vibra-capture.ts
