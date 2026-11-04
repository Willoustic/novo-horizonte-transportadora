# 05 - Perfis e Permissoes

## Perfis

- admin: gestao de usuarios + todas as funcionalidades
- padrao: funcionalidades operacionais
- restrito: sem acesso (conta desativada)

## Matriz de Acesso

| Modulo               | admin | padrao | restrito |
| -------------------- | ----- | ------ | -------- |
| Dashboard            | sim   | sim    | nao      |
| Pedidos              | sim   | sim    | nao      |
| Carregamentos        | sim   | sim    | nao      |
| Estoque              | sim   | sim    | nao      |
| Emprestimos          | sim   | sim    | nao      |
| Cotacoes (registrar) | sim   | sim    | nao      |
| Cotacoes (comparar)  | sim   | sim    | nao      |
| Cadastros            | sim   | sim    | nao      |
| Parametros           | sim   | nao    | nao      |
| Usuarios             | sim   | nao    | nao      |
| Historico            | sim   | sim    | nao      |
