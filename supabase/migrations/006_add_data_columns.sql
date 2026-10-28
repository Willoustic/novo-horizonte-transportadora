-- 006_add_data_columns.sql
-- Adicionando coluna data onde falta e criando indices de performance

-- Pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS data DATE DEFAULT CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_pedidos_data ON pedidos(data);

-- Carregamentos
ALTER TABLE carregamentos ADD COLUMN IF NOT EXISTS data DATE DEFAULT CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_carregamentos_data ON carregamentos(data);

-- Movimentacoes de Estoque
ALTER TABLE movimentacoes_estoque ADD COLUMN IF NOT EXISTS data DATE DEFAULT CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_movimentacoes_estoque_data ON movimentacoes_estoque(data);

-- Emprestimos
ALTER TABLE emprestimos ADD COLUMN IF NOT EXISTS data DATE DEFAULT CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_emprestimos_data ON emprestimos(data);

-- Estoque Snapshots
ALTER TABLE estoque_snapshots ADD COLUMN IF NOT EXISTS data DATE DEFAULT CURRENT_DATE;
CREATE INDEX IF NOT EXISTS idx_estoque_snapshots_data ON estoque_snapshots(data);
