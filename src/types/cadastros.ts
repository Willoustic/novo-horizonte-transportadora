// Types for Cadastros (Registrations)

export interface Posto {
  id: string
  nome: string
  abreviacao: string
  tipo: "FILIAL" | "CLIENTE"
  regiao: string | null
  ativo: boolean
  created_at: string
}

export interface Combustivel {
  id: string
  nome: string
  abreviacao: string
  densidade: number
  ativo: boolean
}

export interface Fornecedor {
  id: string
  nome: string
  telefone: string | null
  tipo: "whatsapp" | "outro"
  ativo: boolean
}

export interface Motorista {
  id: string
  nome: string
  cnh: string | null
  categoria: string | null
  validade_cnh: string | null
  ativo: boolean
}

export interface Cavalo {
  id: string
  placa: string
  modelo: string | null
  ano: number | null
  ativo: boolean
}

export interface TanqueCarreta {
  id: string
  identificacao: string
  capacidade_litros: number
  ativo: boolean
}

export interface TanquePosto {
  id: string
  posto_id: string
  numero: number
  combustivel_id: string
  capacidade_litros: number
  estoque_minimo: number
  ativo: boolean
  posto?: Posto
  combustivel?: Combustivel
}