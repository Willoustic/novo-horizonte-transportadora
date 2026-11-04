# 10 - Regras de Precos e Comparacao

## Chave Composta

Posto + Combustivel + Fornecedor (constraint UNIQUE)

## Registro de Preco

- Tentativa de duplicata -> modal de confirmacao
- Se Sim: atualiza + registra em HistoricoPreco
- Se Nao: descarta

## Comparacao de Precos

- Por posto + combustivel: fornecedores ordenados do menor para o maior
- Melhor preco (menor valor) destacado em verde
- Filtros: por posto, por combustivel, por periodo

## Historico

- Cada alteracao gera registro em HistoricoPreco
- Campos: preco_anterior, preco_novo, data_alteracao, fonte, alterado_por

## Fontes

- vibra: capturado do portal
- whatsapp: recebido via mensagem
- manual: entrada direta pelo operador
