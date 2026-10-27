ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS base TEXT;
CREATE INDEX IF NOT EXISTS idx_cotacoes_base ON cotacoes(base);