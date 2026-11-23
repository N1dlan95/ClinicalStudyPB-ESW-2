// Contrato da API de visitas e resultados (openapi.yaml: VisitaResposta, ResultadosVisita, ResultadosEntrada)

export type StatusVisita = 'AGENDADA' | 'REALIZADA' | 'AUSENTE' | 'CANCELADA'

export const ROTULO_STATUS_VISITA: Record<StatusVisita, string> = {
  AGENDADA: 'Agendada',
  REALIZADA: 'Realizada',
  AUSENTE: 'Ausente',
  CANCELADA: 'Cancelada',
}

// GET /visitas/{id} (só o coordenador): usado no cabeçalho da tela de resultados
export interface Visita {
  id: number
  estudoId: number
  participante: { candidatoId: number; nome: string }
  visitaPrevista: { id: number; ordem: number; nome: string }
  dataHora: string
  local: string | null
  status: StatusVisita
  observacao: string | null
}

// RF14: uma atividade da visita prevista, com o resultado registrado ou nulo
export interface ItemResultado {
  atividadeId: number
  ordem: number
  descricao: string
  resultado: string | null
  observacao: string | null
  registradoEm: string | null
  registradoPor: string | null
}

export interface ResultadosVisita {
  visitaId: number
  status: StatusVisita
  itens: ItemResultado[]
}

export interface ResultadosEntrada {
  itens: { atividadeId: number; resultado: string; observacao: string | null }[]
}
