-- 001_initial_schema.sql
-- Novo Horizonte Transportadora de Combustiveis

-- Enums
CREATE TYPE posto_tipo AS ENUM ('FILIAL', 'CLIENTE');
CREATE TYPE perfil_tipo AS ENUM ('admin', 'padrao', 'restrito');
CREATE TYPE fornecedor_tipo AS ENUM ('vibra', 'whatsapp', 'outro');
CREATE TYPE pedido_status AS ENUM ('pendente', 'confirmado', 'em_carregamento', 'entregue', 'cancelado');
CREATE TYPE carregamento_status AS ENUM ('carregando', 'em_transito', 'entregue', 'devolvido', 'cancelado');
CREATE TYPE movimentacao_tipo AS ENUM ('entrada', 'saida', 'emprestimo', 'devolucao');
CREATE TYPE emprestimo_status AS ENUM ('pendente', 'devolvido_parcial', 'devolvido');
CREATE TYPE cotacao_fonte AS ENUM ('vibra', 'whatsapp', 'manual');

-- Postos
CREATE TABLE postos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  abreviacao TEXT NOT NULL,
  tipo posto_tipo NOT NULL DEFAULT 'CLIENTE',
  regiao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Combustiveis
CREATE TABLE combustiveis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  abreviacao TEXT NOT NULL UNIQUE,
  densidade DECIMAL(5,3) NOT NULL DEFAULT 0.800,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Fornecedores
CREATE TABLE fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  telefone TEXT,
  tipo fornecedor_tipo NOT NULL DEFAULT 'outro',
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Motoristas
CREATE TABLE motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnh TEXT,
  categoria TEXT,
  validade_cnh DATE,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Cavalos
CREATE TABLE cavalos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT NOT NULL,
  modelo TEXT,
  ano INT,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Tanques de Carreta
CREATE TABLE tanques_carreta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identificacao TEXT NOT NULL,
  capacidade_litros DECIMAL(12,2) NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Tanques de Posto
CREATE TABLE tanques_posto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posto_id UUID NOT NULL REFERENCES postos(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  combustivel_id UUID NOT NULL REFERENCES combustiveis(id),
  capacidade_litros DECIMAL(12,2) NOT NULL,
  estoque_minimo DECIMAL(12,2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (posto_id, numero)
);

-- Usuarios
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  perfil perfil_tipo NOT NULL DEFAULT 'padrao',
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Estoque Snapshot (historico diario)
CREATE TABLE estoque_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanque_posto_id UUID NOT NULL REFERENCES tanques_posto(id) ON DELETE CASCADE,
  volume DECIMAL(12,2) NOT NULL,
  data DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tanque_posto_id, data)
);

-- Entregas
CREATE TABLE entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanque_posto_id UUID NOT NULL REFERENCES tanques_posto(id) ON DELETE CASCADE,
  volume DECIMAL(12,2) NOT NULL,
  data DATE NOT NULL,
  carregamento_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pedidos
CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posto_id UUID NOT NULL REFERENCES postos(id),
  data DATE NOT NULL,
  status pedido_status NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  criado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Itens de Pedido
CREATE TABLE itens_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  tanque_posto_id UUID NOT NULL REFERENCES tanques_posto(id),
  combustivel_id UUID NOT NULL REFERENCES combustiveis(id),
  volume_solicitado DECIMAL(12,2) NOT NULL
);

-- Carregamentos
CREATE TABLE carregamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES pedidos(id),
  posto_destino_id UUID NOT NULL REFERENCES postos(id),
  motorista_id UUID NOT NULL REFERENCES motoristas(id),
  cavalo_id UUID NOT NULL REFERENCES cavalos(id),
  tanque_carreta_id UUID NOT NULL REFERENCES tanques_carreta(id),
  volume DECIMAL(12,2) NOT NULL,
  base_origem TEXT,
  status carregamento_status NOT NULL DEFAULT 'carregando',
  data_saida TIMESTAMPTZ,
  data_chegada TIMESTAMPTZ,
  criado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Movimentacoes de Estoque
CREATE TABLE movimentacoes_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanque_posto_id UUID NOT NULL REFERENCES tanques_posto(id) ON DELETE CASCADE,
  tipo movimentacao_tipo NOT NULL,
  volume DECIMAL(12,2) NOT NULL,
  data TIMESTAMPTZ NOT NULL DEFAULT now(),
  referencia TEXT,
  observacao TEXT,
  criado_por UUID REFERENCES usuarios(id)
);

-- Emprestimos
CREATE TABLE emprestimos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  combustivel_id UUID NOT NULL REFERENCES combustiveis(id),
  volume DECIMAL(12,2) NOT NULL,
  posto_origem_id UUID NOT NULL REFERENCES postos(id),
  posto_destino_id UUID NOT NULL REFERENCES postos(id),
  data_emprestimo DATE NOT NULL,
  data_devolucao DATE,
  status emprestimo_status NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  criado_por UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cotacoes
CREATE TABLE cotacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  posto_id UUID NOT NULL REFERENCES postos(id),
  combustivel_id UUID NOT NULL REFERENCES combustiveis(id),
  fornecedor_id UUID NOT NULL REFERENCES fornecedores(id),
  preco DECIMAL(10,4) NOT NULL,
  fonte cotacao_fonte NOT NULL DEFAULT 'manual',
  anexo_url TEXT,
  data_registro TIMESTAMPTZ NOT NULL DEFAULT now(),
  registrado_por UUID REFERENCES usuarios(id),
  ativo BOOLEAN NOT NULL DEFAULT true,
  UNIQUE (posto_id, combustivel_id, fornecedor_id)
);

-- Historico de Precos
CREATE TABLE historico_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id UUID NOT NULL REFERENCES cotacoes(id) ON DELETE CASCADE,
  preco_anterior DECIMAL(10,4) NOT NULL,
  preco_novo DECIMAL(10,4) NOT NULL,
  data_alteracao TIMESTAMPTZ NOT NULL DEFAULT now(),
  fonte cotacao_fonte NOT NULL,
  alterado_por UUID REFERENCES usuarios(id)
);

-- Parametros
CREATE TABLE parametros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo TEXT NOT NULL,
  chave TEXT NOT NULL,
  valor TEXT NOT NULL,
  descricao TEXT,
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (grupo, chave)
);
