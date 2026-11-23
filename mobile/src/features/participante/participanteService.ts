import { API_URL, USE_MOCK_API } from '../../config/env';
import { SessaoExpiradaError, notificarSessaoExpirada } from '../auth/sessaoExpirada';
import type { EstudoParticipante, Visita } from './types';

/**
 * Serviço do participante (RF17 a RF20). Os dados vêm sempre do usuário do token.
 *
 * Contrato da API (openapi.yaml, tag "App do participante"):
 *   GET  /api/participantes/me/estudos   (RF17)
 *   GET  /api/participantes/me/visitas   (RF18)
 * Ainda sem rota no backend (Sprint 4), desligados em config/funcionalidades.ts:
 *   POST /api/participantes/me/visitas/{id}/confirmacao    (RF19)
 *   POST /api/participantes/me/visitas/{id}/reagendamento  (RF19)
 *   POST /api/participantes/me/estudos/{id}/retirada       (RF20)
 * Com EXPO_PUBLIC_USE_MOCK=true, usa dados fictícios em memória.
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
  // Token vencido ou encerrado: o AuthProvider limpa a sessão e volta ao login
  if (resposta.status === 401) {
    notificarSessaoExpirada();
    throw new SessaoExpiradaError();
  }
  if (!resposta.ok) {
    throw new ServicoError('Não foi possível concluir a operação. Tente novamente.');
  }
  return (await resposta.json()) as T;
}

const servicoApi: ParticipanteService = {
  listarEstudos: (t) => requisicao(t, 'GET', '/api/participantes/me/estudos'),
  listarVisitas: (t) => requisicao(t, 'GET', '/api/participantes/me/visitas'),
  confirmarPresenca: (t, id) => requisicao(t, 'POST', `/api/participantes/me/visitas/${id}/confirmacao`),
  solicitarReagendamento: (t, id) => requisicao(t, 'POST', `/api/participantes/me/visitas/${id}/reagendamento`),
  solicitarRetirada: (t, id) => requisicao(t, 'POST', `/api/participantes/me/estudos/${id}/retirada`),
};

// Data e hora ISO (sem fuso) a tantos dias de hoje, para o modo simulado sempre ter visitas futuras
function diasDeHoje(dias: number, hora = '09:00'): string {
  const data = new Date();
  data.setDate(data.getDate() + dias);
  const dia = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`;
  return `${dia}T${hora}:00`;
}

/** Dados fictícios para o modo simulado (EXPO_PUBLIC_USE_MOCK=true), no mesmo formato da API. */
export function criarServicoMock(atrasoMs = 300): ParticipanteService {
  const visitas: Visita[] = [
    { id: 1, estudoId: 1, estudoTitulo: 'Estudo de exemplo A', nome: 'Visita inicial', dataHora: diasDeHoje(-20, '10:00'), local: 'Ambulatório (fictício), sala 3', status: 'REALIZADA' },
    { id: 2, estudoId: 1, estudoTitulo: 'Estudo de exemplo A', nome: 'Retorno de 7 dias', dataHora: diasDeHoje(-13), local: 'Ambulatório (fictício), sala 3', status: 'AUSENTE' },
    { id: 3, estudoId: 1, estudoTitulo: 'Estudo de exemplo A', nome: 'Retorno de 30 dias', dataHora: diasDeHoje(10), local: 'Ambulatório (fictício), sala 3', status: 'AGENDADA' },
    { id: 4, estudoId: 1, estudoTitulo: 'Estudo de exemplo A', nome: 'Visita final', dataHora: diasDeHoje(70, '14:30'), local: null, status: 'AGENDADA' },
  ];
  const estudos: EstudoParticipante[] = [
    {
      id: 1,
      titulo: 'Estudo de exemplo A',
      responsavel: 'Pesquisador Demo',
      estado: 'EXECUCAO',
      dataInicio: diasDeHoje(-40).slice(0, 10),
      dataFim: null,
      candidatoId: 10,
      participacao: 'INCLUIDO',
      dataInclusao: diasDeHoje(-21).slice(0, 10),
      retiradaEm: null,
      proximaVisita: { id: 3, nome: 'Retorno de 30 dias', dataHora: diasDeHoje(10) },
    },
    {
      id: 2,
      titulo: 'Estudo de exemplo B',
      responsavel: 'Pesquisador Demo',
      estado: 'ENCERRADO',
      dataInicio: diasDeHoje(-300).slice(0, 10),
      dataFim: diasDeHoje(-120).slice(0, 10),
      candidatoId: 11,
      participacao: 'RETIRADO',
      dataInclusao: diasDeHoje(-290).slice(0, 10),
      retiradaEm: diasDeHoje(-200),
      proximaVisita: null,
    },
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
