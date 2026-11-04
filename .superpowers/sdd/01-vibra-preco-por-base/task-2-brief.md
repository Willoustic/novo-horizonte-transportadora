# Task Brief — Tarefa 2

Plano: docs/planos/01-vibra-preco-por-base.md
Tarefa: 2 — Vínculo base × preço na extração
Base commit: 6b6d872

## Contexto
`extractPrices(bodyText)` (linhas 116-127) retorna `{ produto, preco }[]` sem a base. O vínculo base×preço hoje vem apenas da variável `base` do loop em `captureBase(base)` (linha 317: `precos.push({ produto, preco, base, posto })`). Precisamos garantir que cada preço carregue explicitamente a base de origem.

## O que fazer
- Alterar `extractPrices` para retornar também a base associada a cada preço, OU garantir que a extração associe base ao preço de forma explícita e rastreável.
- Cada item de preço deve conter: produto, preço, base (abreviacao), posto.
- Não perder a informação de base entre a extração e a gravação.

## Critérios de aceitação
- Cada preço extraído tem seu campo `base` preenchido com a abreviacao da base de origem.
- O vínculo base × preço é explícito (não depende apenas de variável de loop implícita).
- Tipo `VibraPreco` já tem campo `base` (linha 57); manter preenchido.

## Arquivos afetados
- scripts/vibra-capture.ts
