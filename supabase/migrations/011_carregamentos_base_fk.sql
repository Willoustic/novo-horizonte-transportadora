-- 011_carregamentos_base_fk.sql
-- Substitui base_origem (TEXT) por base_id (FK bases) em carregamentos.

-- Adiciona coluna base_id (UUID, nullable)
ALTER TABLE carregamentos ADD COLUMN IF NOT EXISTS base_id UUID;

-- Popula base_id a partir de base_origem (texto)
UPDATE carregamentos c
SET base_id = b.id
FROM bases b
WHERE c.base_origem IS NOT NULL
  AND c.base_origem <> ''
  AND c.base_origem = b.abreviacao;

-- Remove coluna base_origem antiga
ALTER TABLE carregamentos DROP COLUMN IF EXISTS base_origem;

-- Adiciona FK base_id
ALTER TABLE carregamentos
  ADD CONSTRAINT fk_carregamentos_base FOREIGN KEY (base_id) REFERENCES bases(id);

-- Indice
CREATE INDEX IF NOT EXISTS idx_carregamentos_base_id ON carregamentos(base_id);
