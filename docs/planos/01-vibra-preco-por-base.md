# Plano — Captura de preço Vibra por base, produto e posto

Objetivo: cada preço capturado do portal Vibra deve aparecer vinculado à base (BAGAM, ARCAB, AISUAP), com preços distintos por produto e posto, cadastrando apenas as 3 bases ativas. Substituir bases hardcoded por leitura dinâmica da tabela `bases` do Supabase.

## Tarefa 1 — Bases dinâmicas do Supabase

Remover `BASES = ["BAGAM", "ARCAB", "AISUAP"]` hardcoded. Buscar bases ativas da tabela `bases` (abreviacao + id) e iterar sobre elas. Se não houver bases cadastradas, logar erro e encerrar.

## Tarefa 2 — Vínculo base × preço na extração

Garantir que cada preço extraído carregue explicitamente o nome/abreviacao da base da qual veio. `extractPrices` deve retornar o produto, preço e base (ou a captura deve associar base ao preço no momento da extração), sem depender apenas de variável de loop.

## Tarefa 3 — Mapeamento de produtos configurável

Substituir `combustivelMap` estático (linhas 584-605) por mapeamento configurável. Pode ser via tabela de mapeamento ou parâmetros, mantendo fallback para os mapeamentos conhecidos. Produto Vibra → combustível deve ser rastreável.

## Tarefa 4 — Log de não mapeados

Quando um produto ou base capturado não tiver mapeamento/combustível ou base_id, logar explicitamente (produto/base não mapeado) em vez de `continue` silencioso.

## Tarefa 5 — Faixa de preço plausível

Adicionar validação de faixa de preço plausível (ex.: preço > 0 e dentro de um limite razoável, p.ex. 0 < preço < 10000) antes de gravar em `cotacoes`/`historico_precos`. Preços fora da faixa são descartados com log.

## Tarefa 6 — Repasse de `data` da rota para o script/workflow

A rota `POST /api/vibra/capturar` recebe `data` e deleta preços `fonte='vibra'` da data, mas não repassa `data` para o workflow/script. Repassar `data` nos inputs do `workflow_dispatch` e no comando do script (`--data=YYYY-MM-DD`), e usar `data` na deleção e gravação de `data_registro`.

Critérios de aceitação (todos):
- Cada preço gravado tem base_id preenchido (FK bases) e não é null.
- Existem preços distintos por posto × combustível × base.
- Apenas bases BAGAM, ARCAB, AISUAP (ativas) são capturadas.
- Não mapeados geram log visível.
- Preços fora da faixa plausível são descartados com log.
- `data` é repassada da rota ao script e usada na gravação.
