import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import type { ResultadosVisita } from './tipos'
import { ErroVisitaApi, buscarVisita, listarResultados, registrarResultados, traduzirErro } from './visitasService'

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), put: vi.fn() },
}))

const apiMock = vi.mocked(api, true)

const RESULTADOS: ResultadosVisita = {
  visitaId: 70,
  status: 'REALIZADA',
  itens: [
    {
      atividadeId: 40,
      ordem: 1,
      descricao: 'Aferir pressão arterial',
      resultado: 'PA 120x80',
      observacao: null,
      registradoEm: '2026-12-01T10:15:00',
      registradoPor: 'Carla',
    },
  ],
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

describe('visitasService', () => {
  it('lista e registra os resultados nas rotas da API', async () => {
    apiMock.get.mockResolvedValue({ data: RESULTADOS })
    apiMock.put.mockResolvedValue({ data: RESULTADOS })
    const entrada = { itens: [{ atividadeId: 40, resultado: 'PA 120x80', observacao: null }] }

    await expect(listarResultados(70)).resolves.toEqual(RESULTADOS)
    expect(apiMock.get).toHaveBeenCalledWith('/visitas/70/resultados')
    await expect(registrarResultados(70, entrada)).resolves.toEqual(RESULTADOS)
    expect(apiMock.put).toHaveBeenCalledWith('/visitas/70/resultados', entrada)
  })

  it('busca a visita pelo id', async () => {
    apiMock.get.mockResolvedValue({ data: { id: 70 } })

    await buscarVisita(70)
    expect(apiMock.get).toHaveBeenCalledWith('/visitas/70')
  })

  it('traduz os erros da API pelo código', async () => {
    apiMock.put.mockRejectedValue(
      erroDaApi(409, { codigo: 'VISITA_NAO_REALIZADA', mensagem: 'Só é possível registrar resultados de uma visita realizada' }),
    )

    const erro = await registrarResultados(70, { itens: [] }).catch((e: unknown) => e)
    expect(erro).toBeInstanceOf(ErroVisitaApi)
    expect(erro).toMatchObject({
      status: 409,
      codigo: 'VISITA_NAO_REALIZADA',
      message: 'Os resultados só podem ser registrados depois que a visita for marcada como realizada.',
    })
  })

  it('usa a mensagem da API para código desconhecido e a do status quando não há corpo', () => {
    expect(traduzirErro(erroDaApi(409, { codigo: 'OUTRO', mensagem: 'Mensagem da API' })).message).toBe(
      'Mensagem da API',
    )
    expect(traduzirErro(erroDaApi(404, {})).message).toBe('Visita não encontrada.')
    expect(traduzirErro(erroDaApi(403, {})).message).toBe('Seu perfil não tem permissão para esta ação.')
    expect(traduzirErro(erroDaApi(400, { mensagem: 'Erro técnico' })).message).toContain('o resultado é obrigatório')
    expect(traduzirErro(erroDaApi(409, {})).message).toBe('A operação conflita com uma regra do estudo.')
    expect(traduzirErro(new Error('rede')).message).toBe('Não foi possível falar com o servidor. Tente novamente.')
  })

  it('não traduz de novo um erro já traduzido', () => {
    const erro = new ErroVisitaApi('x', 409, 'Y')
    expect(traduzirErro(erro)).toBe(erro)
  })
})
