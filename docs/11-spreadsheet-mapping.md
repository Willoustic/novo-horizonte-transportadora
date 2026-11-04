# 11 - Mapeamento Planilha -> Sistema

## Planilha: Planilha teste.xlsx (data 23/10/2026)

### Postos (coluna A)

- PNH2 - ZN -> Posto (FILIAL)
- PNH1 - ZS -> Posto (FILIAL)
- VITORIA -> Posto (FILIAL)

### Tanques por posto (coluna B)

- PNH2-ZN: Tq 1 (DS10), Tq 2 (DS10), Tq 3 (ET), Tq 4 (GC)
- PNH1-ZS: Tq 1 (DS10), Tq 2 (GC), Tq 3 (DS500), Tq 4 (GA), Tq 5 (ET), Tq 6 (GC)
- VITORIA: Tq 1 (ET), Tq 2 (GC), Tq 3 (DS500/DC), Tq 4 (GA), Tq 5 (DS10)

### Colunas

- C: Estoque por tanque -> EstoqueSnapshot
- D: Entregas por tanque -> Entrega
- E/F: Pedidos por tanque (PNH2-ZN)
- H/I/J: Posto destino, volume, produto (pedidos clientes)
- M: quantidade/produto (emprestimos)
- N: DE (posto origem)
- O: PARA (posto destino)
- P: DATA EMP
- Q: DATA DEV
- Motoristas/Cavalos/Tanques/Litros/Base -> Carregamento
- T/U/V: Melhores precos -> Cotacao
- Linha 20: 65000 (total pedidos filiais), 105000 (total filiais + clientes)

### DC = DS500

A abreviacao DC na planilha (Posto Vitoria, Tq 3) e Diesel S500.
