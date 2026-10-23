export interface ItemPedido {
  id: string
  pedido_id: string
  combustivel_id: string
  quantidade_litros: number
  fornecedor_id: string
  preco_unitario: number
  combustivel?: { nome: string; abreviacao: string }
  fornecedor?: { nome: string }
}

export interface Pedido {
  id: string
  posto_id: string
  status: "pendente" | "aprovado" | "em_carregamento" | "concluido" | "cancelado"
  observacoes: string | null
  created_at: string
  updated_at: string
  posto?: { nome: string; abreviacao: string }
  itens?: ItemPedido[]
}