// Contrato de GET /candidatos/{candidatoId}/historico (openapi.yaml: Historico, HistoricoVisita, RetiradaCandidato)
import type { StatusCandidato } from '../candidatos/tipos'
import type { ItemResultado, StatusVisita } from '../visitas/tipos'

export interface RetiradaCandidato {
  registradaEm: string // ISO date-time
  registradaPor: string
  motivo: string
}

export interface HistoricoVisita {
  id: number
  visitaPrevista: { id: number; ordem: number; nome: string }
  dataHora: string // ISO date-time
  local: string | null
  status: StatusVisita
  observacao: string | null // motivo do cancelamento ou anotação
  resultados: ItemResultado[] // só as atividades com resultado registrado
}

export interface Historico {
  participante: {
    candidatoId: number
    nome: string
    email: string
    status: StatusCandidato
    dataInclusao: string | null // ISO date
    retirada: RetiradaCandidato | null // só quando o status é RETIRADO
  }
  estudo: { id: number; titulo: string }
  visitas: HistoricoVisita[] // da mais antiga para a mais recente
}
