/** Estados do estudo conforme RF07 do enunciado. */
export type StatusEstudo = 'PLANEJAMENTO' | 'RECRUTAMENTO' | 'EXECUCAO' | 'ENCERRADO';

/** Situação da participação no estudo. */
export type Participacao = 'INCLUIDO' | 'RETIRADO';

/** Situação da visita no app: as canceladas não chegam ao participante (RF18). */
export type StatusVisita = 'AGENDADA' | 'REALIZADA' | 'AUSENTE';

export interface ProximaVisita {
  id: number;
  nome: string;
  dataHora: string; // ISO yyyy-mm-ddThh:mm:ss
}

/** GET /api/participantes/me/estudos (schema EstudoDoParticipante do openapi.yaml). */
export interface EstudoParticipante {
  id: number;
  titulo: string;
  responsavel: string;
  estado: StatusEstudo;
  dataInicio: string; // ISO yyyy-mm-dd
  dataFim: string | null;
  candidatoId: number;
  participacao: Participacao;
  dataInclusao: string;
  retiradaEm: string | null;
  proximaVisita: ProximaVisita | null;
  /** RF20 (Sprint 4): participante já pediu retirada pelo app. Ainda não vem da API. */
  retiradaSolicitada?: boolean;
}

/** GET /api/participantes/me/visitas (schema VisitaDoParticipante do openapi.yaml). */
export interface Visita {
  id: number;
  estudoId: number;
  estudoTitulo: string;
  nome: string;
  dataHora: string; // ISO yyyy-mm-ddThh:mm:ss
  local: string | null;
  status: StatusVisita;
  /** RF19 (Sprint 4): presença confirmada pelo participante. Ainda não vem da API. */
  presencaConfirmada?: boolean;
  /** RF19 (Sprint 4): participante pediu reagendamento. Ainda não vem da API. */
  reagendamentoSolicitado?: boolean;
}
