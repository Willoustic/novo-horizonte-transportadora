-- Adiciona 'base' à UNIQUE constraint de cotacoes para permitir
-- captura de preços por base (BAGAM, ARCAB, AISUAP) sem conflitos.
-- Antes: UNIQUE (posto_id, combustivel_id, fornecedor_id)
-- Depois: UNIQUE (posto_id, combustivel_id, fornecedor_id, base)

DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'cotacoes'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%posto_id%combustivel_id%fornecedor_id%';
  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE cotacoes DROP CONSTRAINT %I', constraint_name);
  END IF;
END $$;

ALTER TABLE cotacoes
  ADD CONSTRAINT cotacoes_posto_combustivel_fornecedor_base_uk
  UNIQUE (posto_id, combustivel_id, fornecedor_id, base);

CREATE INDEX IF NOT EXISTS idx_cotacoes_posto_combustivel_base
  ON cotacoes (posto_id, combustivel_id, base);
