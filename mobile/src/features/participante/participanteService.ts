import { API_URL, USE_MOCK_API } from '../../config/env';
import type { EstudoParticipante, Visita } from './types';

/**
 * Serviço do participante (RF17 a RF20).
 *
 * Endpoints PROVISÓRIOS até a API publicar o OpenAPI; ajuste só este arquivo:
 *   GET  /api/participante/estudos
 *   GET  /api/participante/visitas
 *   POST /api/participante/visitas/{id}/confirmacao
 *   POST /api/participante/visitas/{id}/reagendamento
 *   POST /api/participante/estudos/{id}/retirada
 * Sem EXPO_PUBLIC_API_URL, usa dados fictícios em memória.
 */
export interface ParticipanteService {
  listarEstudos(token: string): Promise<EstudoParticipante[]>;
  listarVisitas(token: string): Promise<Visita[]>;
  confirmarPresenca(token: string, visitaId: number): Promise<Visita>;
  solicitarReagendamento(token: string, visitaId: number): Promise<Visita>;
  solicitarRetirada(token: string, estudoId: number): Promise<EstudoParticipante>;
}

export class ServicoError extends Error {}

async function requisicao<T>(token: string, metodo: 'GET' | 'POST', caminho: string): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: metodo,
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ServicoError('Não foi possível conectar ao servidor. Verifique sua conexão.');
  }
  if (!resposta.ok) {
    throw new ServicoError('Não foi possível concluir a operação. Tente novamente.');
  }
  return (await resposta.json()) as T;
}

const servicoApi: ParticipanteService = {
  listarEstudos: (t) => requisicao(t, 'GET', '/api/participante/estudos'),
  listarVisitas: (t) => requisicao(t, 'GET', '/api/participante/visitas'),
  confirmarPresenca: (t, id) => requisicao(t, 'POST', `/api/participante/visitas/${id}/confirmacao`),
  solicitarReagendamento: (t, id) => requisicao(t, 'POST', `/api/participante/visitas/${id}/reagendamento`),
  solicitarRetirada: (t, id) => requisicao(t, 'POST', `/api/participante/estudos/${id}/retirada`),
};

/** Dados fictícios para desenvolvimento e demonstração sem backend. */
export function criarServicoMock(atrasoMs = 300): ParticipanteService {
  const estudos: EstudoParticipante[] = [
    {
      id: 1,
      titulo: 'Estudo de exemplo A',
      responsavel: 'Pesquisador Demo',
      status: 'EXECUCAO',
      dataInicio: '2026-10-15',
      dataFim: '2027-03-31',
      retiradaSolicitada: false,
    },
    {
      id: 2,
      titulo: 'Estudo de exemplo B',
      responsavel: 'Pesquisador Demo',
      status: 'ENCERRADO',
      dataInicio: '2026-01-10',
      dataFim: '2026-06-30',
      retiradaSolicitada: false,
    },
  ];
  const visitas: Visita[] = [
    { id: 1, estudoId: 1, estudoTitulo: 'Estudo de exemplo A', nome: 'Visita 2 · Acompanhamento', dataHora: '2026-10-28T09:00', local: 'Ambulatório (fictício), sala 3', status: 'AGENDADA', presencaConfirmada: false, reagendamentoSolicitado: false },
    { id: 2, estudoId: 1, estudoTitulo: 'Estudo de exemplo A', nome: 'Visita 3 · Avaliação final', dataHora: '2026-11-25T14:30', local: 'Ambulatório (fictício), sala 3', status: 'AGENDADA', presencaConfirmada: false, reagendamentoSolicitado: false },
    { id: 3, estudoId: 1, estudoTitulo: 'Estudo de exemplo A', nome: 'Visita 1 · Inclusão', dataHora: '2026-10-15T10:00', local: 'Ambulatório (fictício), sala 3', status: 'REALIZADA', presencaConfirmada: true, reagendamentoSolicitado: false },
    { id: 4, estudoId: 2, estudoTitulo: 'Estudo de exemplo B', nome: 'Visita de triagem', dataHora: '2026-01-08T08:30', local: 'Ambulatório (fictício), sala 1', status: 'AUSENTE', presencaConfirmada: false, reagendamentoSolicitado: false },
  ];
  const espera = () => new Promise((r) => setTimeout(r, atrasoMs));
  const atualizarVisita = async (id: number, campos: Partial<Visita>) => {
    await espera();
    const v = visitas.find((x) => x.id === id);
    if (!v) throw new ServicoError('Visita não encontrada.');
    Object.assign(v, campos);
    return { ...v };
  };
  return {
    listarEstudos: async () => (await espera(), estudos.map((e) => ({ ...e }))),
    listarVisitas: async () => (await espera(), visitas.map((v) => ({ ...v }))),
    confirmarPresenca: (_t, id) => atualizarVisita(id, { presencaConfirmada: true, reagendamentoSolicitado: false }),
    solicitarReagendamento: (_t, id) => atualizarVisita(id, { reagendamentoSolicitado: true, presencaConfirmada: false }),
    solicitarRetirada: async (_t, id) => {
      await espera();
      const e = estudos.find((x) => x.id === id);
      if (!e) throw new ServicoError('Estudo não encontrado.');
      e.retiradaSolicitada = true;
      return { ...e };
    },
  };
}

export const participanteService: ParticipanteService = USE_MOCK_API ? criarServicoMock() : servicoApi;
