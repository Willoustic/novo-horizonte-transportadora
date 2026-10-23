-- 003_seed_data.sql
-- Seed data for Novo Horizonte Transportadora de Combustiveis

-- Combustiveis
INSERT INTO combustiveis (nome, abreviacao, densidade) VALUES
  ('Gasolina Comum', 'GC', 0.740),
  ('Gasolina Aditivada', 'GA', 0.740),
  ('Diesel S10', 'DS10', 0.840),
  ('Diesel S500', 'DS500', 0.840),
  ('Etanol', 'ET', 0.810);

-- Postos Filiais
INSERT INTO postos (nome, abreviacao, tipo, regiao) VALUES
  ('Posto Novo Horizonte e Comercio Derivados de Petroleo', 'PNH2-ZN', 'FILIAL', 'ZN'),
  ('Posto Transportes e Comercio Novo Horizonte', 'PNH1-ZS', 'FILIAL', 'ZS'),
  ('Posto Vitoria LTDA', 'VITORIA', 'FILIAL', 'VITORIA');

-- Fornecedores
INSERT INTO fornecedores (nome, tipo) VALUES
  ('Vibra', 'vibra'),
  ('Setta', 'outro'),
  ('Larco', 'outro'),
  ('Petrovia', 'outro');

-- Tanques de Posto (mapeados da planilha)
-- PNH2-ZN: Tq 1 (DS10), Tq 2 (DS10), Tq 3 (ET), Tq 4 (GC)
INSERT INTO tanques_posto (posto_id, numero, combustivel_id, capacidade_litros, estoque_minimo)
SELECT p.id, t.numero, c.id, t.cap, t.min
FROM postos p
CROSS JOIN (VALUES
  (1, 'DS10', 15000.00, 3000.00),
  (2, 'DS10', 15000.00, 3000.00),
  (3, 'ET', 10000.00, 2000.00),
  (4, 'GC', 10000.00, 2000.00)
) AS t(numero, comb, cap, min)
JOIN combustiveis c ON c.abreviacao = t.comb
WHERE p.abreviacao = 'PNH2-ZN';

-- PNH1-ZS: Tq 1 (DS10), Tq 2 (GC), Tq 3 (DS500), Tq 4 (GA), Tq 5 (ET), Tq 6 (GC)
INSERT INTO tanques_posto (posto_id, numero, combustivel_id, capacidade_litros, estoque_minimo)
SELECT p.id, t.numero, c.id, t.cap, t.min
FROM postos p
CROSS JOIN (VALUES
  (1, 'DS10', 15000.00, 3000.00),
  (2, 'GC', 10000.00, 2000.00),
  (3, 'DS500', 15000.00, 3000.00),
  (4, 'GA', 10000.00, 2000.00),
  (5, 'ET', 10000.00, 2000.00),
  (6, 'GC', 10000.00, 2000.00)
) AS t(numero, comb, cap, min)
JOIN combustiveis c ON c.abreviacao = t.comb
WHERE p.abreviacao = 'PNH1-ZS';

-- VITORIA: Tq 1 (ET), Tq 2 (GC), Tq 3 (DS500), Tq 4 (GA), Tq 5 (DS10)
INSERT INTO tanques_posto (posto_id, numero, combustivel_id, capacidade_litros, estoque_minimo)
SELECT p.id, t.numero, c.id, t.cap, t.min
FROM postos p
CROSS JOIN (VALUES
  (1, 'ET', 10000.00, 2000.00),
  (2, 'GC', 10000.00, 2000.00),
  (3, 'DS500', 15000.00, 3000.00),
  (4, 'GA', 10000.00, 2000.00),
  (5, 'DS10', 15000.00, 3000.00)
) AS t(numero, comb, cap, min)
JOIN combustiveis c ON c.abreviacao = t.comb
WHERE p.abreviacao = 'VITORIA';

-- Parametros (admin config - valores placeholder criptografados)
INSERT INTO parametros (grupo, chave, valor, descricao) VALUES
  ('vibra', 'login', 'PLACEHOLDER_ENCRYPTED', 'Login do portal Vibra'),
  ('vibra', 'senha', 'PLACEHOLDER_ENCRYPTED', 'Senha do portal Vibra'),
  ('vibra', 'url_portal', 'https://portal.vibra.com.br', 'URL do portal Vibra'),
  ('gmail', 'email', 'PLACEHOLDER_ENCRYPTED', 'Email para 2FA Vibra'),
  ('gmail', 'senha_app', 'PLACEHOLDER_ENCRYPTED', 'Senha de app do Gmail'),
  ('geral', 'estoque_alerta', 'true', 'Habilitar alertas de estoque minimo');
