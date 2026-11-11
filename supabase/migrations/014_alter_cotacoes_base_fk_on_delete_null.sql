-- 014_alter_cotacoes_base_fk_on_delete_null.sql
-- Altera a FK fk_cotacoes_base entre cotacoes(base_id) e bases(id)
-- para usar ON DELETE SET NULL. Assim, quando uma base for excluida,
-- as cotacoes referentes ficam com base_id nulo em vez de bloquear
-- a exclusao ou cair em erro de integridade.

ALTER TABLE cotacoes
  DROP CONSTRAINT fk_cotacoes_base;

ALTER TABLE cotacoes
  ADD CONSTRAINT fk_cotacoes_base FOREIGN KEY (base_id) REFERENCES bases(id) ON DELETE SET NULL;
