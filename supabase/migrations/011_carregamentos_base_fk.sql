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

-- Tabela de auditoria: preserva valores de base_origem que nao bateram com a seed
CREATE TABLE IF NOT EXISTS auditoria_base_migracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_origem TEXT NOT NULL,
  coluna_origem TEXT NOT NULL,
  valor_original TEXT NOT NULL,
  registro_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE auditoria_base_migracao ENABLE ROW LEVEL SECURITY;
CREATE POLICY IF NOT EXISTS auditoria_base_migracao_select ON auditoria_base_migracao FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY IF NOT EXISTS auditoria_base_migracao_insert ON auditoria_base_migracao FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY IF NOT EXISTS auditoria_base_migracao_update ON auditoria_base_migracao FOR UPDATE
  USING (get_user_perfil() = 'admin');
CREATE POLICY IF NOT EXISTS auditoria_base_migracao_delete ON auditoria_base_migracao FOR DELETE
  USING (get_user_perfil() = 'admin');

-- Arquiva valores nao-mapeados antes de destruir a coluna
INSERT INTO auditoria_base_migracao (tabela_origem, coluna_origem, valor_original, registro_id)
SELECT 'carregamentos', 'base_origem', c.base_origem, c.id
FROM carregamentos c
WHERE c.base_origem IS NOT NULL
  AND c.base_origem <> ''
  AND NOT EXISTS (SELECT 1 FROM bases b WHERE b.abreviacao = c.base_origem);

-- Remove coluna base_origem antiga
ALTER TABLE carregamentos DROP COLUMN IF EXISTS base_origem;

-- Adiciona FK base_id
ALTER TABLE carregamentos
  ADD CONSTRAINT fk_carregamentos_base FOREIGN KEY (base_id) REFERENCES bases(id);

-- Indice
CREATE INDEX IF NOT EXISTS idx_carregamentos_base_id ON carregamentos(base_id);
