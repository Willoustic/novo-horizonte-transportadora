-- 007_remove_vibra.sql
-- Revert Vibra-related schema changes and IMAP params

-- Remove Vibra mapping columns
ALTER TABLE postos DROP COLUMN IF EXISTS codigo_base_vibra;
ALTER TABLE combustiveis DROP COLUMN IF EXISTS codigo_vibra;

-- Remove vibra-specific indexes
DROP INDEX IF EXISTS idx_postos_codigo_base_vibra;
DROP INDEX IF EXISTS idx_combustiveis_codigo_vibra;

-- Remove IMAP parameters
DELETE FROM parametros WHERE grupo = 'imap';

-- Keep idx_cotacoes_data_registro (used by date filtering)
