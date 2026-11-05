# Task Brief — Tarefa 6

Plano: docs/planos/01-vibra-preco-por-base.md
Tarefa: 6 — Repasse de `data` da rota para o script/workflow
Base commit: 6b6d872

## Contexto
`POST /api/vibra/capturar` recebe `data` no body, usa-a apenas para deletar preços `fonte='vibra'` da data, mas não repassa `data` para o workflow_dispatch nem para o script. O workflow `vibra-capture.yml` recebe apenas `posto` nos inputs, não `data`.

## O que fazer
- Na rota: repassar `data` nos `inputs` do `workflow_dispatch` (já faz `inputs: { posto, data }` na linha 71, mas verificar que o workflow aceita `data`).
- No workflow `.github/workflows/vibra-capture.yml`: adicionar input `data` e repassar para o script como `--data=YYYY-MM-DD`.
- No script `scripts/vibra-capture.ts`: ler argumento `--data=`, usar a data para deletar preços vibra existentes dessa data antes de gravar (ou passar para gravação de data_registro).
- Se `data` não for informada, usar a data atual (hoje) como padrão.

## Critérios de aceitação
- A rota envia `data` no workflow_dispatch.
- O workflow aceita input `data` e passa `--data` para o script.
- O script lê `--data` e usa para deletar/gravar preços dessa data.
- Default: data atual quando não informado.

## Arquivos afetados
- src/app/api/vibra/capturar/route.ts
- .github/workflows/vibra-capture.yml
- scripts/vibra-capture.ts
