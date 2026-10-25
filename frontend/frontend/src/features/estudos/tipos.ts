export type StatusEstudo = 'planejado' | 'em_execucao' | 'encerrado'

export const ROTULO_STATUS: Record<StatusEstudo, string> = {
  planejado: 'Planejado',
  em_execucao: 'Em execução',
  encerrado: 'Encerrado',
}

export interface Estudo {
  id: string
  titulo: string
  codigoProtocolo: string
  descricao: string
  pesquisadorId: string
  pesquisadorNome: string
  status: StatusEstudo
  dataInicio: string // ISO: aaaa-mm-dd
  dataTermino: string // ISO: aaaa-mm-dd
  limiteParticipantes: number
  participantesIncluidos: number
  proximaVisita: string | null // ISO
  pedidosRetirada: number
  ultimaAlteracaoEm: string | null // ISO
  ultimaAlteracaoPor: string | null
}

// Dados enviados ao criar/editar (o backend calcula incluídos, visitas etc.)
export interface EstudoEntrada {
  titulo: string
  codigoProtocolo: string
  descricao: string
  pesquisadorId: string
  status: StatusEstudo
  dataInicio: string
  dataTermino: string
  limiteParticipantes: number
}

export interface Pesquisador {
  id: string
  nome: string
}

// Estado dos campos do formulário (tudo texto, como o usuário digita)
export interface FormularioEstudo {
  titulo: string
  codigoProtocolo: string
  descricao: string
  pesquisadorId: string
  status: StatusEstudo
  dataInicio: string // dd/mm/aaaa
  dataTermino: string // dd/mm/aaaa
  limiteParticipantes: string
}

export type CampoEstudo = keyof FormularioEstudo
export type ErrosEstudo = Partial<Record<CampoEstudo, string>>
