-- 002_rls_policies.sql
-- Row Level Security policies for Novo Horizonte Transportadora

-- Helper function: get user profile
CREATE OR REPLACE FUNCTION get_user_perfil()
RETURNS perfil_tipo AS 
  SELECT perfil FROM usuarios WHERE id = auth.uid();
 LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS on all tables
ALTER TABLE postos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustiveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavalos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanques_carreta ENABLE ROW LEVEL SECURITY;
ALTER TABLE tanques_posto ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE carregamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque ENABLE ROW LEVEL SECURITY;
ALTER TABLE emprestimos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE parametros ENABLE ROW LEVEL SECURITY;

-- ===== POSTOS =====
CREATE POLICY postos_select ON postos FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY postos_insert ON postos FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY postos_update ON postos FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY postos_delete ON postos FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== COMBUSTIVEIS =====
CREATE POLICY combustiveis_select ON combustiveis FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY combustiveis_insert ON combustiveis FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY combustiveis_update ON combustiveis FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY combustiveis_delete ON combustiveis FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== FORNECEDORES =====
CREATE POLICY fornecedores_select ON fornecedores FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY fornecedores_insert ON fornecedores FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY fornecedores_update ON fornecedores FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY fornecedores_delete ON fornecedores FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== MOTORISTAS =====
CREATE POLICY motoristas_select ON motoristas FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY motoristas_insert ON motoristas FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY motoristas_update ON motoristas FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY motoristas_delete ON motoristas FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== CAVALOS =====
CREATE POLICY cavalos_select ON cavalos FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY cavalos_insert ON cavalos FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY cavalos_update ON cavalos FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY cavalos_delete ON cavalos FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== TANQUES CARRETA =====
CREATE POLICY tanques_carreta_select ON tanques_carreta FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY tanques_carreta_insert ON tanques_carreta FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY tanques_carreta_update ON tanques_carreta FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY tanques_carreta_delete ON tanques_carreta FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== TANQUES POSTO =====
CREATE POLICY tanques_posto_select ON tanques_posto FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY tanques_posto_insert ON tanques_posto FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY tanques_posto_update ON tanques_posto FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY tanques_posto_delete ON tanques_posto FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== USUARIOS =====
CREATE POLICY usuarios_select ON usuarios FOR SELECT
  USING (get_user_perfil() = 'admin');
CREATE POLICY usuarios_insert ON usuarios FOR INSERT
  WITH CHECK (get_user_perfil() = 'admin');
CREATE POLICY usuarios_update ON usuarios FOR UPDATE
  USING (get_user_perfil() = 'admin');
CREATE POLICY usuarios_delete ON usuarios FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== ESTOQUE SNAPSHOTS =====
CREATE POLICY estoque_snapshots_select ON estoque_snapshots FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY estoque_snapshots_insert ON estoque_snapshots FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY estoque_snapshots_update ON estoque_snapshots FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY estoque_snapshots_delete ON estoque_snapshots FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== ENTREGAS =====
CREATE POLICY entregas_select ON entregas FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY entregas_insert ON entregas FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY entregas_update ON entregas FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY entregas_delete ON entregas FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== PEDIDOS =====
CREATE POLICY pedidos_select ON pedidos FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY pedidos_insert ON pedidos FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY pedidos_update ON pedidos FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY pedidos_delete ON pedidos FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== ITENS PEDIDO =====
CREATE POLICY itens_pedido_select ON itens_pedido FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY itens_pedido_insert ON itens_pedido FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY itens_pedido_update ON itens_pedido FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY itens_pedido_delete ON itens_pedido FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== CARREGAMENTOS =====
CREATE POLICY carregamentos_select ON carregamentos FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY carregamentos_insert ON carregamentos FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY carregamentos_update ON carregamentos FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY carregamentos_delete ON carregamentos FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== MOVIMENTACOES ESTOQUE =====
CREATE POLICY movimentacoes_estoque_select ON movimentacoes_estoque FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY movimentacoes_estoque_insert ON movimentacoes_estoque FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY movimentacoes_estoque_update ON movimentacoes_estoque FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY movimentacoes_estoque_delete ON movimentacoes_estoque FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== EMPRESTIMOS =====
CREATE POLICY emprestimos_select ON emprestimos FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY emprestimos_insert ON emprestimos FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY emprestimos_update ON emprestimos FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY emprestimos_delete ON emprestimos FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== COTACOES =====
CREATE POLICY cotacoes_select ON cotacoes FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY cotacoes_insert ON cotacoes FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY cotacoes_update ON cotacoes FOR UPDATE
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY cotacoes_delete ON cotacoes FOR DELETE
  USING (get_user_perfil() = 'admin');

-- ===== HISTORICO PRECOS =====
CREATE POLICY historico_precos_select ON historico_precos FOR SELECT
  USING (get_user_perfil() IN ('admin', 'padrao'));
CREATE POLICY historico_precos_insert ON historico_precos FOR INSERT
  WITH CHECK (get_user_perfil() IN ('admin', 'padrao'));

-- ===== PARAMETROS (admin only) =====
CREATE POLICY parametros_select ON parametros FOR SELECT
  USING (get_user_perfil() = 'admin');
CREATE POLICY parametros_insert ON parametros FOR INSERT
  WITH CHECK (get_user_perfil() = 'admin');
CREATE POLICY parametros_update ON parametros FOR UPDATE
  USING (get_user_perfil() = 'admin');
CREATE POLICY parametros_delete ON parametros FOR DELETE
  USING (get_user_perfil() = 'admin');
