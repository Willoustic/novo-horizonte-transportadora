-- 013_add_uf_cidade_fornecedor_to_bases.sql
-- Adiciona colunas uf, cidade e fornecedor_id (FK para fornecedores) à tabela bases.

ALTER TABLE bases
  ADD COLUMN IF NOT EXISTS uf TEXT;

ALTER TABLE bases
  ADD COLUMN IF NOT EXISTS cidade TEXT;

ALTER TABLE bases
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES fornecedores(id);

-- Índices para busca/filtro por estado e fornecedor
CREATE INDEX IF NOT EXISTS idx_bases_fornecedor_id ON bases(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_bases_uf ON bases(uf);

-- RLS já está habilitado em bases (migração 009) e as políticas existentes
-- (bases_select/insert/update/delete) abrangem as novas colunas.
-- perfis admin/padrao: SELECT/INSERT/UPDATE; apenas admin: DELETE (soft-delete via ativo=false).
