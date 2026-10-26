-- 005_vibra_mapping.sql
-- Campos de mapeamento para integração com Vibra Energia (parser de e-mail)

-- Mapeamento de base Vibra -> posto do sistema
ALTER TABLE postos ADD COLUMN IF NOT EXISTS codigo_base_vibra TEXT;

-- Mapeamento de combustível Vibra -> combustível do sistema
ALTER TABLE combustiveis ADD COLUMN IF NOT EXISTS codigo_vibra TEXT;

-- Índice para busca por data em cotacoes (filtro diário)
CREATE INDEX IF NOT EXISTS idx_cotacoes_data_registro ON cotacoes (data_registro);
CREATE INDEX IF NOT EXISTS idx_postos_codigo_base_vibra ON postos (codigo_base_vibra);
CREATE INDEX IF NOT EXISTS idx_combustiveis_codigo_vibra ON combustiveis (codigo_vibra);
