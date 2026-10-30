-- 009_bases_table.sql
-- Cria tabela bases (BAGAM, ARCAB, AISUAP) e migra coluna base TEXT de cotacoes para FK base_id.

-- Tabela bases
CREATE TABLE bases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  abreviacao TEXT NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed bases
INSERT INTO bases (nome, abreviacao) VALUES
  ('Bagam', 'BAGAM'),
  ('Arcab', 'ARCAB'),
  ('Aisuap', 'AISUAP');

-- RLS para bases
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY bases_select ON bases FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY bases_insert ON bases FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY bases_update ON bases FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY bases_delete ON bases FOR DELETE
  USING (get_user_perfil() = 'admin');

-- Adiciona coluna base_id (UUID, nullable) em cotacoes
ALTER TABLE cotacoes ADD COLUMN IF NOT EXISTS base_id UUID;

-- Popula base_id a partir da coluna base (texto) existente
UPDATE cotacoes c
SET base_id = b.id
FROM bases b
WHERE c.base IS NOT NULL
  AND c.base <> ''
  AND c.base = b.abreviacao;

-- Remove constraint UNIQUE antiga (com base TEXT)
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'cotacoes'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%posto_id%combustivel_id%fornecedor_id%base%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE cotacoes DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

-- Remove coluna base TEXT antiga
ALTER TABLE cotacoes DROP COLUMN IF EXISTS base;

-- Adiciona FK base_id e constraint UNIQUE nova
ALTER TABLE cotacoes
  ADD CONSTRAINT fk_cotacoes_base FOREIGN KEY (base_id) REFERENCES bases(id);

ALTER TABLE cotacoes
  ADD CONSTRAINT cotacoes_posto_combustivel_fornecedor_base_uk
  UNIQUE (posto_id, combustivel_id, fornecedor_id, base_id);

CREATE INDEX IF NOT EXISTS idx_cotacoes_base_id ON cotacoes(base_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_posto_combustivel_base_id ON cotacoes (posto_id, combustivel_id, base_id);
