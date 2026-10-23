# 03 - Regras de Negocio

## Totais do Dashboard
- 65000 = soma de pedidos dos 3 postos filiais
- 105000 = soma de pedidos de filiais + clientes
- Programacao de carretas = total carregando no dia

## Baixa de Estoque
- Ao criar Carregamento, baixa automatica no estoque do posto de origem
- Ao marcar Carregamento como entregue, registra Entrega no tanque do posto destino

## Emprestimos
- Sem aprovacao formal
- Controle de existencia e status: pendente -> devolvido_parcial -> devolvido

## Estoque Minimo
- Campo estoque_minimo em TanquePosto
- Alerta visual no dashboard quando volume < estoque_minimo

## Status de Pedido
pendente -> confirmado -> em_carregamento -> entregue | cancelado

## Status de Carregamento
carregando -> em_transito -> entregue | devolvido | cancelado

## Status de Emprestimo
pendente -> devolvido_parcial -> devolvido
