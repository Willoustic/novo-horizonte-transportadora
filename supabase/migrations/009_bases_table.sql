-- 009_bases_table.sql
-- Cria tabela bases (BAGAM, ARCAB, AISUAP) e migra coluna base TEXT de cotacoes para FK base_id.

-- Tabela bases
CREATE TABLE IF NOT EXISTS bases (
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
  ('Aisuap', 'AISUAP')
ON CONFLICT (abreviacao) DO NOTHING;

-- RLS para bases
ALTER TABLE bases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bases_select' AND tablename = 'bases') THEN
    CREATE POLICY bases_select ON bases FOR SELECT
      USING (get_user_perfil() IN ('admin', 'padrao'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bases_insert' AND tablename = 'bases') THEN
    CREATE POLICY bases_insert ON bases FOR INSERT
      WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bases_update' AND tablename = 'bases') THEN
    CREATE POLICY bases_update ON bases FOR UPDATE
      USING (get_user_perfil() IN ('admin', 'padrao'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'bases_delete' AND tablename = 'bases') THEN
    CREATE POLICY bases_delete ON bases FOR DELETE
      USING (get_user_perfil() = 'admin');
  END IF;
END $$;

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

-- Tabela de auditoria: preserva valores de base que nao bateram com a seed (BAGAM/ARCAB/AISUAP)
CREATE TABLE IF NOT EXISTS auditoria_base_migracao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela_origem TEXT NOT NULL,
  coluna_origem TEXT NOT NULL,
  valor_original TEXT NOT NULL,
  registro_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE auditoria_base_migracao ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auditoria_base_migracao_select' AND tablename = 'auditoria_base_migracao') THEN
    CREATE POLICY auditoria_base_migracao_select ON auditoria_base_migracao FOR SELECT
      USING (get_user_perfil() IN ('admin', 'padrao'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auditoria_base_migracao_insert' AND tablename = 'auditoria_base_migracao') THEN
    CREATE POLICY auditoria_base_migracao_insert ON auditoria_base_migracao FOR INSERT
      WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auditoria_base_migracao_update' AND tablename = 'auditoria_base_migracao') THEN
    CREATE POLICY auditoria_base_migracao_update ON auditoria_base_migracao FOR UPDATE
      USING (get_user_perfil() = 'admin');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'auditoria_base_migracao_delete' AND tablename = 'auditoria_base_migracao') THEN
    CREATE POLICY auditoria_base_migracao_delete ON auditoria_base_migracao FOR DELETE
      USING (get_user_perfil() = 'admin');
  END IF;
END $$;

-- Arquiva valores nao-mapeados antes de destruir a coluna
INSERT INTO auditoria_base_migracao (tabela_origem, coluna_origem, valor_original, registro_id)
SELECT 'cotacoes', 'base', c.base, c.id
FROM cotacoes c
WHERE c.base IS NOT NULL
  AND c.base <> ''
  AND NOT EXISTS (SELECT 1 FROM bases b WHERE b.abreviacao = c.base);

-- Remove coluna base TEXT antiga
ALTER TABLE cotacoes DROP COLUMN IF EXISTS base;

-- Adiciona FK base_id e constraint UNIQUE nova
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_cotacoes_base') THEN
    ALTER TABLE cotacoes ADD CONSTRAINT fk_cotacoes_base FOREIGN KEY (base_id) REFERENCES bases(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cotacoes_posto_combustivel_fornecedor_base_uk') THEN
    ALTER TABLE cotacoes ADD CONSTRAINT cotacoes_posto_combustivel_fornecedor_base_uk UNIQUE (posto_id, combustivel_id, fornecedor_id, base_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cotacoes_base_id ON cotacoes(base_id);
CREATE INDEX IF NOT EXISTS idx_cotacoes_posto_combustivel_base_id ON cotacoes (posto_id, combustivel_id, base_id);
