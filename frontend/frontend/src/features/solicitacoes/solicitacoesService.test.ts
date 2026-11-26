import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import { aprovarSolicitacao, listarSolicitacoes, recusarSolicitacao } from './solicitacoesService'

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))

const apiMock = vi.mocked(api, true)

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

describe('solicitacoesService', () => {
  it('lista com os filtros informados e omite os vazios', async () => {
    apiMock.get.mockResolvedValue({ data: [] })
    await listarSolicitacoes(3, { status: 'PENDENTE', tipo: undefined })
    expect(apiMock.get).toHaveBeenCalledWith('/estudos/3/solicitacoes', { params: { status: 'PENDENTE' } })
  })

  it('aprova e recusa nas rotas da API, com a justificativa na recusa', async () => {
    apiMock.post.mockResolvedValue({ data: { id: 9 } })
    await aprovarSolicitacao(9)
    expect(apiMock.post).toHaveBeenCalledWith('/solicitacoes/9/aprovacao')
    await recusarSolicitacao(9, 'Sem agenda disponível')
    expect(apiMock.post).toHaveBeenCalledWith('/solicitacoes/9/recusa', { justificativa: 'Sem agenda disponível' })
  })

  it('traduz o código da API em mensagem e preserva o código', async () => {
    apiMock.post.mockRejectedValue(erroDaApi(409, { codigo: 'SOLICITACAO_JA_DECIDIDA', mensagem: 'x' }))
    await expect(aprovarSolicitacao(9)).rejects.toMatchObject({
      status: 409,
      codigo: 'SOLICITACAO_JA_DECIDIDA',
      message: expect.stringMatching(/já decidiu esta solicitação/),
    })
  })

  it('usa a mensagem de validação da recusa no 400 e a mensagem da API em códigos desconhecidos', async () => {
    apiMock.post.mockRejectedValueOnce(erroDaApi(400, { codigo: 'VALIDACAO' }))
    await expect(recusarSolicitacao(9, '')).rejects.toMatchObject({
      message: 'Informe a justificativa da recusa (até 500 caracteres).',
    })
    apiMock.post.mockRejectedValueOnce(erroDaApi(409, { codigo: 'OUTRO', mensagem: 'Regra nova do backend.' }))
    await expect(aprovarSolicitacao(9)).rejects.toMatchObject({ message: 'Regra nova do backend.' })
  })

  it('mostra mensagem de servidor indisponível quando não há resposta', async () => {
    apiMock.get.mockRejectedValue(new Error('rede'))
    await expect(listarSolicitacoes(3)).rejects.toMatchObject({
      status: null,
      message: 'Não foi possível falar com o servidor. Tente novamente.',
    })
  })
})
