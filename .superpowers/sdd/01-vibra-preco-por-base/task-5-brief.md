# Task Brief — Tarefa 5

Plano: docs/planos/01-vibra-preco-por-base.md
Tarefa: 5 — Faixa de preço plausível
Base commit: 6b6d872

## Contexto
Hoje o único filtro é `preco > 0` (linhas 316, 326). Não há limite superior nem validação de plausibilidade. Um preço absurdo (extração errada) seria gravado.

## O que fazer
- Adicionar constante de faixa plausível, ex.: preço mínimo > 0 e preço máximo < 10.000 (R$/litro ou unidade do portal).
- Aplicar a validação tanto na extração (captureBase) quanto antes de gravar em cotacoes/historico_precos.
- Preços fora da faixa são descartados com log explícito (`Preço fora da faixa: <produto> base <base> R$ <preco>`).
- O limite superior deve ser configurável (env var `VIBRA_MAX_PRECO` ou constante com valor sensível).

## Critérios de aceitação
- Existe validação de faixa: 0 < preço < limite_superior.
- Preços fora da faixa são descartados com log.
- Limite superior configurável (env var ou constante bem nomeada).
- Não grava preços absurdos em cotacoes/historico_precos.

## Arquivos afetados
- scripts/vibra-capture.ts
