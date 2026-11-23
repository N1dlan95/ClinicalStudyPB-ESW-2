import type { ParticipanteService } from '../participanteService';
import type { EstudoParticipante, Visita } from '../types';

// Dados fixos no formato da API, para os testes de componente não dependerem da data de hoje

export const estudoIncluido: EstudoParticipante = {
  id: 3,
  titulo: 'Estudo de Controle Glicêmico',
  responsavel: 'Ana Pesquisadora',
  estado: 'EXECUCAO',
  dataInicio: '2026-11-01',
  dataFim: '2027-03-31',
  candidatoId: 7,
  participacao: 'INCLUIDO',
  dataInclusao: '2026-11-20',
  retiradaEm: null,
  proximaVisita: { id: 13, nome: 'Retorno de 30 dias', dataHora: '2026-12-30T09:00:00' },
};

export const estudoRetirado: EstudoParticipante = {
  id: 4,
  titulo: 'Estudo de Hipertensão',
  responsavel: 'Bruno Pesquisador',
  estado: 'ENCERRADO',
  dataInicio: '2026-01-10',
  dataFim: '2026-06-30',
  candidatoId: 8,
  participacao: 'RETIRADO',
  dataInclusao: '2026-01-15',
  retiradaEm: '2026-03-02T10:30:00',
  proximaVisita: null,
};

export const visitas: Visita[] = [
  { id: 12, estudoId: 3, estudoTitulo: 'Estudo de Controle Glicêmico', nome: 'Visita inicial', dataHora: '2026-12-01T09:00:00', local: 'Sala 2', status: 'REALIZADA' },
  { id: 14, estudoId: 3, estudoTitulo: 'Estudo de Controle Glicêmico', nome: 'Retorno de 7 dias', dataHora: '2026-12-08T09:00:00', local: null, status: 'AUSENTE' },
  { id: 15, estudoId: 3, estudoTitulo: 'Estudo de Controle Glicêmico', nome: 'Visita final', dataHora: '2027-02-28T14:30:00', local: 'Sala 4', status: 'AGENDADA' },
  { id: 13, estudoId: 3, estudoTitulo: 'Estudo de Controle Glicêmico', nome: 'Retorno de 30 dias', dataHora: '2026-12-30T09:00:00', local: 'Sala 2', status: 'AGENDADA' },
];

export function criarServico(campos: Partial<ParticipanteService> = {}): ParticipanteService {
  return {
    listarEstudos: jest.fn().mockResolvedValue([estudoIncluido, estudoRetirado]),
    listarVisitas: jest.fn().mockResolvedValue(visitas),
    confirmarPresenca: jest.fn(),
    solicitarReagendamento: jest.fn(),
    solicitarRetirada: jest.fn(),
    ...campos,
  };
}
