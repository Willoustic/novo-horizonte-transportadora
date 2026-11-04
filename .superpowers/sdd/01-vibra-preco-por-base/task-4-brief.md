# Task Brief — Tarefa 4

Plano: docs/planos/01-vibra-preco-por-base.md
Tarefa: 4 — Log de não mapeados
Base commit: 6b6d872

## Contexto
No loop de gravação (linhas 635-700), quando `combustivelId` ou `baseId` não é encontrado, ocorre `continue` silencioso (sem log). O operador não sabe quais produtos/bases foram descartados.

## O que fazer
- Quando `combustivelId` não encontrado: logar explicitamente `Produto não mapeado: <produto> (posto <postoAbrev>, base <base>)`.
- Quando `baseId` não encontrado: logar explicitamente `Base não mapeada: <base> (posto <postoAbrev>)`.
- Usar `logEtapa` com etapa apropriada (ex.: "nao-mapeado").
- Não silenciar: todo não-mapeado gera uma linha de log visível.

## Critérios de aceitação
- Não existe mais `continue` silencioso sem log para combustível ou base não mapeados.
- Cada não-mapeado gera log com identificação do produto/base e posto.
- O fluxo continua para os próximos itens (não aborta).

## Arquivos afetados
- scripts/vibra-capture.ts
