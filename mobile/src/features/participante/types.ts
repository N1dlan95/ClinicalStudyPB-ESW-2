/** Estados do estudo conforme RF07 do enunciado. */
export type StatusEstudo = 'PLANEJAMENTO' | 'RECRUTAMENTO' | 'EXECUCAO' | 'ENCERRADO';

/** Situação da visita conforme RF13 do enunciado. */
export type StatusVisita = 'AGENDADA' | 'REALIZADA' | 'AUSENTE' | 'CANCELADA';

export interface EstudoParticipante {
  id: number;
  titulo: string;
  responsavel: string;
  status: StatusEstudo;
  dataInicio: string; // ISO yyyy-mm-dd
  dataFim: string;
  /** Participante já pediu retirada voluntária (RF20). */
  retiradaSolicitada: boolean;
}

export interface Visita {
  id: number;
  estudoId: number;
  estudoTitulo: string;
  nome: string;
  dataHora: string; // ISO yyyy-mm-ddThh:mm
  local: string;
  status: StatusVisita;
  /** RF19: presença prevista confirmada pelo participante. */
  presencaConfirmada: boolean;
  /** RF19: participante pediu reagendamento. */
  reagendamentoSolicitado: boolean;
}
