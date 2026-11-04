# Task Brief — Tarefa 3

Plano: docs/planos/01-vibra-preco-por-base.md
Tarefa: 3 — Mapeamento de produtos configurável
Base commit: 6b6d872

## Contexto
`combustivelMap` (linhas 580-605) é um Map estático construído dos combustíveis do DB, com overrides hardcoded para nomes Vibra (óleo diesel b s500, gasolina comum c, etc.). Não há como configurar novos mapeamentos sem alterar o código.

## O que fazer
- Manter o mapeamento padrão dos nomes Vibra conhecidos como fallback.
- Tornar o mapeamento configurável: permitir sobrescrever/estender via tabela de parâmetros ou via variável de ambiente JSON (ex.: `VIBRA_PRODUCT_MAP`), ou via uma tabela de mapeamento no Supabase.
- Prioridade: configuração externa > fallback estático.
- Se um produto Vibra não tiver mapeamento (nem configurado nem fallback), logar como não mapeado (tarefa 4) e continuar.

## Critérios de aceitação
- Existe um ponto de configuração externo para mapeamento produto Vibra → combustível (env var JSON ou tabela/parametros).
- O mapeamento estático permanece como fallback quando não há config externa.
- Código não quebra se a config externa estiver ausente ou inválida (usa fallback).

## Arquivos afetados
- scripts/vibra-capture.ts
