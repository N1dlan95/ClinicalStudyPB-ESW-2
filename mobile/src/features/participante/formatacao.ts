import type { TipoStatus } from '../../components/StatusChip';
import type { Participacao, StatusEstudo, StatusVisita } from './types';

export function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarDataHora(iso: string): string {
  return `${formatarData(iso)} · ${iso.slice(11, 16)}`;
}

export const rotuloStatusEstudo: Record<StatusEstudo, { texto: string; tipo: TipoStatus }> = {
  PLANEJAMENTO: { texto: 'Planejamento', tipo: 'neutro' },
  RECRUTAMENTO: { texto: 'Recrutamento', tipo: 'info' },
  EXECUCAO: { texto: 'Em execução', tipo: 'sucesso' },
  ENCERRADO: { texto: 'Encerrado', tipo: 'neutro' },
};

export const rotuloParticipacao: Record<Participacao, { texto: string; tipo: TipoStatus }> = {
  INCLUIDO: { texto: 'Participando', tipo: 'sucesso' },
  RETIRADO: { texto: 'Retirado', tipo: 'neutro' },
};

export const rotuloStatusVisita: Record<StatusVisita, { texto: string; tipo: TipoStatus }> = {
  AGENDADA: { texto: 'Agendada', tipo: 'info' },
  REALIZADA: { texto: 'Realizada', tipo: 'sucesso' },
  AUSENTE: { texto: 'Ausente', tipo: 'alerta' },
};
