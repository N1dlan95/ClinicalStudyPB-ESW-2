import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import { listarCandidatos } from '../candidatos/candidatosService'
import type { Candidato } from '../candidatos/tipos'
import { listarVisitasPrevistas } from '../estudos/estudosService'
import type { VisitaPrevista } from '../estudos/tipos'
import {
  ErroAgendaApi,
  agendarVisita,
  buscarVisitaAgendada,
  deVisitaApi,
  listarVisitasAgendadas,
  registrarExecucaoVisita,
  traduzirErro,
  type VisitaApi,
} from './agendaService'

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))
vi.mock('../candidatos/candidatosService', () => ({ listarCandidatos: vi.fn() }))
vi.mock('../estudos/estudosService', () => ({ listarVisitasPrevistas: vi.fn() }))

const apiMock = vi.mocked(api, true)

// Resposta real da API (VisitaResponse)
const VISITA_API: VisitaApi = {
  id: 500,
  estudoId: 1,
  participante: { candidatoId: 10, nome: 'Maria Souza' },
  visitaPrevista: { id: 100, ordem: 1, nome: 'Visita de triagem' },
  dataHora: '2026-11-25T09:00:00',
  local: 'Sala 2',
  status: 'AGENDADA',
  observacao: null,
  janela: { inicio: '2026-11-23', fim: '2026-11-27' },
  agendadaPor: 'Carla Coordenadora',
  statusRegistradoEm: null,
  statusRegistradoPor: null,
}

const CANDIDATO: Candidato = {
  id: 10,
  nome: 'Maria Souza',
  email: 'maria@exemplo.test',
  telefone: null,
  dataNascimento: '1990-05-10',
  status: 'INCLUIDO',
  dataInclusao: '2026-11-10',
}

const PREVISTA: VisitaPrevista = {
  id: 100,
  ordem: 1,
  nome: 'Visita de triagem',
  diaPrevisto: 15,
  janelaDias: 2,
  descricao: null,
  atividades: [],
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
  vi.mocked(listarCandidatos).mockResolvedValue([CANDIDATO])
  vi.mocked(listarVisitasPrevistas).mockResolvedValue([PREVISTA])
})

describe('agendaService', () => {
  it('lista a agenda pela rota da API e completa com o candidato e a visita prevista', async () => {
    apiMock.get.mockResolvedValue({ data: [VISITA_API] })

    const [visita] = await listarVisitasAgendadas(1, 'AGENDADA')

    expect(apiMock.get).toHaveBeenCalledWith('/estudos/1/visitas', { params: { status: 'AGENDADA' } })
    expect(visita).toMatchObject({
      id: 500,
      participante: { id: 10, nome: 'Maria Souza', email: 'maria@exemplo.test', dataInclusao: '2026-11-10' },
      visitaPrevista: { id: 100, nome: 'Visita de triagem', diaPrevisto: 15, janelaDias: 2 },
      dataAgendada: '2026-11-25',
      horaAgendada: '09:00',
      dataSugerida: '2026-11-25',
      janelaInicio: '2026-11-23',
      janelaFim: '2026-11-27',
      foraDaJanela: false,
      local: 'Sala 2',
      status: 'AGENDADA',
    })
  })

  it('sem filtro, não manda parâmetros', async () => {
    apiMock.get.mockResolvedValue({ data: [] })

    await listarVisitasAgendadas(1)

    expect(apiMock.get).toHaveBeenCalledWith('/estudos/1/visitas', undefined)
  })

  // O pesquisador não consulta os candidatos (403): a agenda aparece sem e-mail, com o que a API trouxe
  it('continua listando quando o perfil não pode consultar candidatos e visitas previstas', async () => {
    apiMock.get.mockResolvedValue({ data: [VISITA_API] })
    vi.mocked(listarCandidatos).mockRejectedValue(new ErroAgendaApi('sem permissão', 403, 'SEM_PERMISSAO'))
    vi.mocked(listarVisitasPrevistas).mockRejectedValue(new ErroAgendaApi('sem permissão', 403, 'SEM_PERMISSAO'))

    const [visita] = await listarVisitasAgendadas(1)

    expect(visita.participante).toMatchObject({ nome: 'Maria Souza', email: '' })
    expect(visita.visitaPrevista.diaPrevisto).toBeNull()
    expect(visita.janelaInicio).toBe('2026-11-23')
  })

  it('não usa mais armazenamento local: erro da API vira erro da tela', async () => {
    apiMock.get.mockRejectedValue(erroDaApi(403, { codigo: 'SEM_PERMISSAO', mensagem: 'Sem permissão' }))

    await expect(listarVisitasAgendadas(1)).rejects.toMatchObject({ status: 403, codigo: 'SEM_PERMISSAO' })
    expect(localStorage.length).toBe(0)
  })

  it('busca uma visita pela rota /visitas/{id}', async () => {
    apiMock.get.mockResolvedValue({ data: VISITA_API })

    const visita = await buscarVisitaAgendada(1, 500)

    expect(apiMock.get).toHaveBeenCalledWith('/visitas/500')
    expect(visita.participante.email).toBe('maria@exemplo.test')
  })

  it('agenda pelo participante, com data e hora juntas', async () => {
    apiMock.post.mockResolvedValue({ data: VISITA_API })

    await agendarVisita(1, {
      participanteId: 10,
      visitaPrevistaId: 100,
      dataAgendada: '2026-11-25',
      horaAgendada: '09:00',
      local: 'Sala 2',
    })

    expect(apiMock.post).toHaveBeenCalledWith('/candidatos/10/visitas', {
      visitaPrevistaId: 100,
      dataHora: '2026-11-25T09:00:00',
      local: 'Sala 2',
    })
  })

  it('no cancelamento, manda o motivo na observação', async () => {
    apiMock.patch.mockResolvedValue({ data: { ...VISITA_API, status: 'CANCELADA', observacao: 'Viajou' } })

    const visita = await registrarExecucaoVisita(1, 500, {
      status: 'CANCELADA',
      observacoes: 'Ligou avisando',
      motivoCancelamento: 'Viajou',
    })

    expect(apiMock.patch).toHaveBeenCalledWith('/visitas/500/status', { status: 'CANCELADA', observacao: 'Viajou' })
    expect(visita).toMatchObject({ status: 'CANCELADA', motivoCancelamento: 'Viajou', observacoes: null })
  })

  it('nos demais status, manda a anotação do atendimento', async () => {
    apiMock.patch.mockResolvedValue({ data: { ...VISITA_API, status: 'REALIZADA', observacao: 'Tudo certo' } })

    const visita = await registrarExecucaoVisita(1, 500, {
      status: 'REALIZADA',
      observacoes: 'Tudo certo',
      motivoCancelamento: null,
    })

    expect(apiMock.patch).toHaveBeenCalledWith('/visitas/500/status', { status: 'REALIZADA', observacao: 'Tudo certo' })
    expect(visita).toMatchObject({ status: 'REALIZADA', observacoes: 'Tudo certo', motivoCancelamento: null })
  })
})

describe('tradução dos erros da API', () => {
  it('leva o erro de janela (campo dataHora) para o campo de data', () => {
    const erro = traduzirErro(
      erroDaApi(400, {
        codigo: 'VALIDACAO',
        mensagem: 'Dados inválidos',
        detalhes: [{ campo: 'dataHora', mensagem: 'A visita "Triagem" deve ser entre 23/11/2026 e 27/11/2026' }],
      }),
    )
    expect(erro.errosCampos.dataAgendada).toBe('A visita "Triagem" deve ser entre 23/11/2026 e 27/11/2026')
  })

  it('aponta o campo certo nos conflitos de agendamento', () => {
    expect(
      traduzirErro(erroDaApi(409, { codigo: 'VISITA_JA_AGENDADA', mensagem: 'Já agendada' })).errosCampos,
    ).toEqual({ visitaPrevistaId: 'Já agendada' })
    expect(
      traduzirErro(erroDaApi(409, { codigo: 'PARTICIPANTE_NAO_INCLUIDO', mensagem: 'Não incluído' })).errosCampos,
    ).toEqual({ participanteId: 'Não incluído' })
  })

  it('usa a mensagem da API ou a do status', () => {
    expect(traduzirErro(erroDaApi(409, { codigo: 'ESTUDO_ENCERRADO', mensagem: 'Estudo encerrado' })).message).toBe(
      'Estudo encerrado',
    )
    expect(traduzirErro(erroDaApi(400, {})).message).toBe('Revise os dados informados para o agendamento.')
    expect(traduzirErro(new Error('rede')).message).toBe('Não foi possível falar com o servidor. Tente novamente.')
  })
})

describe('conversão da resposta', () => {
  it('marca fora da janela e trata visita sem janela', () => {
    expect(deVisitaApi({ ...VISITA_API, dataHora: '2026-12-01T09:00:00' }).foraDaJanela).toBe(true)
    expect(deVisitaApi({ ...VISITA_API, janela: null })).toMatchObject({
      foraDaJanela: false,
      dataSugerida: null,
      janelaInicio: null,
    })
  })
})
