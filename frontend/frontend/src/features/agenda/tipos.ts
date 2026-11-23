// Tipos da agenda do estudo e execução de visitas (RF12 e RF13 — Release 2).
import type { StatusCandidato } from '../candidatos/tipos'

export type StatusVisitaAgendada = 'AGENDADA' | 'REALIZADA' | 'AUSENTE' | 'CANCELADA'

export const ROTULO_STATUS_VISITA: Record<StatusVisitaAgendada, string> = {
  AGENDADA: 'Agendada',
  REALIZADA: 'Realizada',
  AUSENTE: 'Ausente',
  CANCELADA: 'Cancelada',
}

export type PeriodoFiltroVisita =
  | 'TODOS'
  | 'HOJE'
  | 'PROXIMOS_7_DIAS'
  | 'ESTE_MES'
  | 'ATRASADAS'

export const ROTULO_PERIODO_VISITA: Record<PeriodoFiltroVisita, string> = {
  TODOS: 'Todos os períodos',
  HOJE: 'Hoje',
  PROXIMOS_7_DIAS: 'Próximos 7 dias',
  ESTE_MES: 'Este mês',
  ATRASADAS: 'Atrasadas / pendentes',
}

export interface ParticipanteVisitaResumo {
  id: number
  nome: string
  email: string
  status: StatusCandidato
  dataInclusao: string | null // ISO: aaaa-mm-dd
}

export interface VisitaPrevistaResumo {
  id: number
  ordem: number
  nome: string
  diaPrevisto: number
  janelaDias: number | null
}

export interface VisitaAgendada {
  id: number
  estudoId: number
  participante: ParticipanteVisitaResumo
  visitaPrevista: VisitaPrevistaResumo
  dataAgendada: string // ISO: aaaa-mm-dd
  horaAgendada: string // hh:mm
  dataSugerida: string | null // ISO: aaaa-mm-dd
  janelaInicio: string | null // ISO: aaaa-mm-dd
  janelaFim: string | null // ISO: aaaa-mm-dd
  foraDaJanela: boolean
  local: string | null
  observacoes: string | null
  status: StatusVisitaAgendada
  motivoCancelamento: string | null
  atualizadoEm?: string | null
  atualizadoPor?: string | null
}

export interface AgendamentoVisitaEntrada {
  participanteId: number
  visitaPrevistaId: number
  dataAgendada: string // ISO: aaaa-mm-dd
  horaAgendada: string // hh:mm
  local: string | null
  observacoes: string | null
}

export type AcaoExecucaoVisita = 'REALIZADA' | 'AUSENTE' | 'CANCELADA'

export interface RegistroExecucaoVisitaEntrada {
  status: AcaoExecucaoVisita
  observacoes: string | null
  motivoCancelamento: string | null
}

export interface FormularioAgendamentoVisita {
  participanteId: string
  visitaPrevistaId: string
  dataAgendada: string // ISO: aaaa-mm-dd
  horaAgendada: string // hh:mm
  local: string
  observacoes: string
}

export type CampoAgendamentoVisita =
  | 'participanteId'
  | 'visitaPrevistaId'
  | 'dataAgendada'
  | 'horaAgendada'
  | 'motivoCancelamento'

export type ErrosAgendamentoVisita = Partial<Record<CampoAgendamentoVisita, string>>
