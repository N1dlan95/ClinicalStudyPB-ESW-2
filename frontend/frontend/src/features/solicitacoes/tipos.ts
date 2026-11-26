// Solicitações do participante (RF19 reagendamento, RF20 retirada) decididas pelo coordenador na web (T-119).
// Contrato proposto para o backend da Sprint 4 (MER-v1, seção 5: rascunho das tabelas de solicitações):
//   GET  /estudos/{estudoId}/solicitacoes?status=&tipo=   -> Solicitacao[] (mais recentes primeiro)
//   POST /solicitacoes/{id}/aprovacao                     -> Solicitacao
//   POST /solicitacoes/{id}/recusa  { justificativa }      -> Solicitacao

export type TipoSolicitacao = 'REAGENDAMENTO' | 'RETIRADA'
export type StatusSolicitacao = 'PENDENTE' | 'APROVADA' | 'RECUSADA'

export const ROTULO_TIPO_SOLICITACAO: Record<TipoSolicitacao, string> = {
  REAGENDAMENTO: 'Reagendamento',
  RETIRADA: 'Retirada',
}

export const ROTULO_STATUS_SOLICITACAO: Record<StatusSolicitacao, string> = {
  PENDENTE: 'Pendente',
  APROVADA: 'Aprovada',
  RECUSADA: 'Recusada',
}

export interface VisitaSolicitacao {
  id: number
  nome: string // nome da visita prevista
  dataHora: string // ISO date-time da visita agendada
  local: string | null
}

export interface Solicitacao {
  id: number
  tipo: TipoSolicitacao
  status: StatusSolicitacao
  participante: { candidatoId: number; nome: string; email: string }
  visita: VisitaSolicitacao | null // só no reagendamento
  motivo: string | null
  dataSugerida: string | null // ISO date; só no reagendamento
  criadaEm: string // ISO date-time
  decididaEm: string | null
  decididaPor: string | null
  justificativa: string | null // motivo da recusa
}
