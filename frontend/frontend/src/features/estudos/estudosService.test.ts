import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import {
  ErroEstudoApi,
  atualizarEstudo,
  buscarEstudo,
  criarEstudo,
  listarEstudos,
  listarPesquisadores,
} from './estudosService'
import type { Estudo, EstudoEntrada } from './tipos'

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const apiMock = vi.mocked(api, true)

// Estudo como a API devolve (EstudoResponse / schema Estudo do openapi.yaml)
const ESTUDO: Estudo = {
  id: 7,
  titulo: 'Estudo de exemplo A',
  objetivo: 'Avaliar a adesão ao tratamento',
  responsavel: { id: 2, nome: 'Pesquisadora Demo' },
  dataInicio: '2026-11-10',
  dataFim: null,
  limiteParticipantes: 30,
  estado: 'PLANEJAMENTO',
}

const ENTRADA: EstudoEntrada = {
  titulo: 'Estudo de exemplo A',
  objetivo: 'Avaliar a adesão ao tratamento',
  responsavelId: 2,
  dataInicio: '2026-11-10',
  dataFim: null,
  limiteParticipantes: 30,
}

function pagina<T>(content: T[]) {
  return { data: { content, number: 0, size: 100, totalElements: content.length, totalPages: 1 } }
}

// Erro que o axios devolve quando o backend responde com o corpo de erro padrão (ErroResponse)
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

describe('estudosService', () => {
  it('lista os estudos da página da API, pedindo até 100 por vez', async () => {
    apiMock.get.mockResolvedValue(pagina([ESTUDO]))

    await expect(listarEstudos()).resolves.toEqual([ESTUDO])
    expect(apiMock.get).toHaveBeenCalledWith('/estudos', { params: { size: 100 } })
  })

  it('busca, cria e atualiza usando as rotas do contrato', async () => {
    apiMock.get.mockResolvedValue({ data: ESTUDO })
    apiMock.post.mockResolvedValue({ data: ESTUDO })
    apiMock.put.mockResolvedValue({ data: ESTUDO })

    await buscarEstudo(7)
    await criarEstudo(ENTRADA)
    await atualizarEstudo(7, ENTRADA)

    expect(apiMock.get).toHaveBeenCalledWith('/estudos/7')
    expect(apiMock.post).toHaveBeenCalledWith('/estudos', ENTRADA)
    expect(apiMock.put).toHaveBeenCalledWith('/estudos/7', ENTRADA)
  })

  it('traduz os detalhes de validação (400) para os campos do formulário', async () => {
    apiMock.post.mockRejectedValue(
      erroDaApi(400, {
        status: 400,
        codigo: 'VALIDACAO',
        mensagem: 'Dados inválidos',
        detalhes: [
          { campo: 'dataFim', mensagem: 'A data de término não pode ser anterior à data de início' },
          { campo: 'responsavelId', mensagem: 'O responsável deve ser um pesquisador ativo' },
        ],
      }),
    )

    const erro = await criarEstudo(ENTRADA).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroEstudoApi)
    expect((erro as ErroEstudoApi).errosCampos).toEqual({
      dataFim: 'A data de término não pode ser anterior à data de início',
      responsavelId: 'O responsável deve ser um pesquisador ativo',
    })
  })

  it('usa a mensagem da API para conflito de regra (estudo encerrado)', async () => {
    apiMock.put.mockRejectedValue(
      erroDaApi(409, { status: 409, codigo: 'ESTUDO_ENCERRADO', mensagem: 'Estudo encerrado não pode ser editado' }),
    )

    const erro = (await atualizarEstudo(7, ENTRADA).catch((e: unknown) => e)) as ErroEstudoApi
    expect(erro.codigo).toBe('ESTUDO_ENCERRADO')
    expect(erro.message).toBe('Estudo encerrado não pode ser editado')
  })

  it('dá uma mensagem de conexão quando não há resposta do servidor', async () => {
    apiMock.get.mockRejectedValue(new Error('Network Error'))

    await expect(listarEstudos()).rejects.toThrow('Não foi possível falar com o servidor. Tente novamente.')
  })

  it('lista só pesquisadores ativos como responsáveis', async () => {
    apiMock.get.mockResolvedValue(
      pagina([
        { id: 2, nome: 'Pesquisadora Demo', perfil: 'PESQUISADOR', ativo: true },
        { id: 5, nome: 'Pesquisador Inativo', perfil: 'PESQUISADOR', ativo: false },
      ]),
    )

    await expect(listarPesquisadores()).resolves.toEqual([{ id: 2, nome: 'Pesquisadora Demo' }])
    expect(apiMock.get).toHaveBeenCalledWith('/usuarios', {
      params: { perfil: 'PESQUISADOR', ativo: true, size: 100 },
    })
  })

  it('devolve null quando o perfil não pode listar usuários (403)', async () => {
    apiMock.get.mockRejectedValue(erroDaApi(403, { status: 403, codigo: 'SEM_PERMISSAO' }))

    await expect(listarPesquisadores()).resolves.toBeNull()
  })
})
