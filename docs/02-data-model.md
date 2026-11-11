# 02 - Modelo de Dados

## Cadastros

Posto: id, nome, abreviacao, tipo (FILIAL/CLIENTE), regiao, ativo, created_at
Combustivel: id, nome, abreviacao, densidade (decimal), ativo
Fornecedor: id, nome, telefone, tipo (vibra/whatsapp/outro), ativo
Motorista: id, nome, cnh, categoria, validade_cnh (date), ativo
Cavalo: id, placa, modelo, ano, ativo
TanqueCarreta: id, identificacao, capacidade_litros (decimal), ativo
TanquePosto: id, posto_id (FK), numero (int), combustivel_id (FK), capacidade_litros (decimal), estoque_minimo (decimal), ativo
Usuario: id, nome, email (unique), senha_hash, perfil (admin/padrao/restrito), ativo, created_at
Base: id, nome, abreviacao, uf, cidade, fornecedor_id (FK fornecedores), ativo, created_at
  - Tabela criada na migracao 009; estendida na migracao 013 (campos uf, cidade, fornecedor_id, ativo, created_at).
  - Migracao 014 altera FK fk_cotacoes_base para ON DELETE SET NULL, permitindo DELETE fisico em bases sem bloqueio por cotacoes.

## Operacao

EstoqueSnapshot: id, tanque_posto_id (FK), volume (decimal), data (date), created_at
Entrega: id, tanque_posto_id (FK), volume (decimal), data (date), carregamento_id (FK, nullable)
Pedido: id, posto_id (FK), data (date), status, observacao, criado_por (FK Usuario), created_at
ItemPedido: id, pedido_id (FK), tanque_posto_id (FK), combustivel_id (FK), volume_solicitado (decimal)
Carregamento: id, pedido_id (FK, nullable), posto_destino_id (FK), motorista_id (FK), cavalo_id (FK), tanque_carreta_id (FK), volume (decimal), base_origem (text), status, data_saida, data_chegada, criado_por (FK Usuario), created_at
MovimentacaoEstoque: id, tanque_posto_id (FK), tipo (entrada/saida/emprestimo/devolucao), volume (decimal), data (timestamp), referencia (text), observacao, criado_por (FK Usuario)
Emprestimo: id, combustivel_id (FK), volume (decimal), posto_origem_id (FK), posto_destino_id (FK), data_emprestimo (date), data_devolucao (date, nullable), status (pendente/devolvido_parcial/devolvido), observacao, criado_por (FK Usuario)

## Precos

Cotacao: id, posto_id (FK), combustivel_id (FK), fornecedor_id (FK), preco (decimal), fonte (vibra/whatsapp/manual), anexo_url (text, nullable), data_registro (timestamp), registrado_por (FK Usuario), ativo (boolean)
Constraint UNIQUE (posto_id, combustivel_id, fornecedor_id)
HistoricoPreco: id, cotacao_id (FK), preco_anterior (decimal), preco_novo (decimal), data_alteracao (timestamp), fonte, alterado_por (FK Usuario)

## Configuracao

Parametro: id, grupo (vibra/gmail/whatsapp/geral), chave, valor (text, criptografado), descricao, atualizado_em (timestamp)

## RLS

- admin: acesso total
- padrao: acesso a operacao
- restrito: sem acesso
- Base: admin/padrao SELECT/INSERT/UPDATE; apenas admin DELETE (exclusao fisica); restrito sem acesso.
