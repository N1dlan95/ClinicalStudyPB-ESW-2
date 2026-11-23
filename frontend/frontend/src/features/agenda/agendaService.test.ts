import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import {
  ErroAgendaApi,
  agendarVisita,
  buscarVisitaAgendada,
  listarVisitasAgendadas,
  registrarExecucaoVisita,
} from './agendaService'
import type { AgendamentoVisitaEntrada, VisitaAgendada } from './tipos'

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

const apiMock = vi.mocked(api, true)

const VISITA: VisitaAgendada = {
  id: 500,
  estudoId: 1,
  participante: {
    id: 10,
    nome: 'Maria Souza',
    email: 'maria@exemplo.test',
    status: 'INCLUIDO',
    dataInclusao: '2026-11-10',
  },
  visitaPrevista: {
    id: 100,
    ordem: 1,
    nome: 'Visita de triagem',
    diaPrevisto: 0,
    janelaDias: 2,
  },
  dataAgendada: '2026-11-25',
  horaAgendada: '09:00',
  dataSugerida: '2026-11-25',
  janelaInicio: '2026-11-23',
  janelaFim: '2026-11-27',
  foraDaJanela: false,
  local: 'Ambulatório Central · Sala 204',
  observacoes: null,
  status: 'AGENDADA',
  motivoCancelamento: null,
}

const ENTRADA: AgendamentoVisitaEntrada = {
  participanteId: 10,
  visitaPrevistaId: 100,
  dataAgendada: '2026-11-25',
  horaAgendada: '09:00',
  local: 'Ambulatório Central · Sala 204',
  observacoes: null,
}

function erroDaApi(status: number, corpo: object) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('erro', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: corpo,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('agendaService', () => {
  it('lista visitas agendadas com e sem filtro de status', async () => {
    apiMock.get.mockResolvedValue({ data: [VISITA] })

    await expect(listarVisitasAgendadas(1)).resolves.toEqual([VISITA])
    expect(apiMock.get).toHaveBeenCalledWith('/estudos/1/visitas-agendadas', undefined)

    await listarVisitasAgendadas(1, 'AGENDADA')
    expect(apiMock.get).toHaveBeenLastCalledWith('/estudos/1/visitas-agendadas', {
      params: { status: 'AGENDADA' },
    })
  })

  it('busca, agenda e atualiza o status de execução da visita', async () => {
    apiMock.get.mockResolvedValue({ data: VISITA })
    apiMock.post.mockResolvedValue({ data: VISITA })
    apiMock.patch.mockResolvedValue({ data: { ...VISITA, status: 'REALIZADA' } })

    await buscarVisitaAgendada(1, 500)
    await agendarVisita(1, ENTRADA)
    await registrarExecucaoVisita(1, 500, {
      status: 'REALIZADA',
      observacoes: 'Coleta concluída',
      motivoCancelamento: null,
    })

    expect(apiMock.get).toHaveBeenCalledWith('/estudos/1/visitas-agendadas/500')
    expect(apiMock.post).toHaveBeenCalledWith('/estudos/1/visitas-agendadas', ENTRADA)
    expect(apiMock.patch).toHaveBeenCalledWith('/estudos/1/visitas-agendadas/500/status', {
      status: 'REALIZADA',
      observacoes: 'Coleta concluída',
      motivoCancelamento: null,
    })
  })

  it('traduz códigos de erro de regra de negócio (409) para os campos correspondentes', async () => {
    apiMock.post.mockRejectedValueOnce(
      erroDaApi(409, {
        codigo: 'VISITA_JA_AGENDADA',
        mensagem: 'Esta visita prevista já está agendada para o participante',
      }),
    )

    const erro = (await agendarVisita(1, ENTRADA).catch((e: unknown) => e)) as ErroAgendaApi
    expect(erro).toBeInstanceOf(ErroAgendaApi)
    expect(erro.errosCampos.visitaPrevistaId).toBe(
      'Esta visita prevista já está agendada para o participante',
    )
  })
})
