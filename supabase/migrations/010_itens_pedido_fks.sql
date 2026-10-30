-- 010_itens_pedido_fks.sql
-- Adiciona base_id (FK bases) e fornecedor_id (FK fornecedores) em itens_pedido.

-- Adiciona colunas nullable
ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS base_id UUID;
ALTER TABLE itens_pedido ADD COLUMN IF NOT EXISTS fornecedor_id UUID;

-- Adiciona FKs
ALTER TABLE itens_pedido
  ADD CONSTRAINT fk_itens_pedido_base FOREIGN KEY (base_id) REFERENCES bases(id);

ALTER TABLE itens_pedido
  ADD CONSTRAINT fk_itens_pedido_fornecedor FOREIGN KEY (fornecedor_id) REFERENCES fornecedores(id);

-- Indices
CREATE INDEX IF NOT EXISTS idx_itens_pedido_base_id ON itens_pedido(base_id);
CREATE INDEX IF NOT EXISTS idx_itens_pedido_fornecedor_id ON itens_pedido(fornecedor_id);
