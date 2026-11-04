# 00 - Visao Geral e Contexto do Negocio

## Empresa

Novo Horizonte Transportadora de Combustiveis

## Postos Filiais (3)

1. PNH2-ZN - Posto Novo Horizonte e Comercio Derivados de Petroleo
2. PNH1-ZS - Posto Transportes e Comercio Novo Horizonte
3. VITORIA - Posto Vitoria LTDA

- Postos clientes (quantidade variavel, CRUD livre)

## Combustiveis (5)

| Abrev. | Nome               | Densidade (kg/L) |
| ------ | ------------------ | ---------------- |
| GC     | Gasolina Comum     | 0.74             |
| GA     | Gasolina Aditivada | 0.74             |
| DS10   | Diesel S10         | 0.84             |
| DS500  | Diesel S500 (DC)   | 0.84             |
| ET     | Etanol             | 0.81             |

## Fornecedores Iniciais

Vibra, Setta, Larco, Petrovia (CRUD completo)

## Problema Atual

- Busca manual de cotacoes em diversos locais
- Controle via planilha (estoque, carregamentos, pedidos, emprestimos, frota)
- Sem historico estruturado nem comparativo de precos
- Sem alertas de estoque minimo

## Solucao

Sistema web multi-posto com:

- Captura de precos (Vibra portal + WhatsApp + manual)
- Comparacao de precos por posto/combustivel/fornecedor
- Controle de pedidos, carregamentos, estoque
- Rastreio de motorista/cavalo/tanque
- Emprestimos/devolucoes
- Dashboard operacional do dia

## Cores da Marca

- Verde: #16a34a (primary)
- Amarelo: #eab308 (accent)
