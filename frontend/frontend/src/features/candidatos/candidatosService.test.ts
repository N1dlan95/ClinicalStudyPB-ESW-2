import { AxiosError, AxiosHeaders } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import {
  ErroCandidatoApi,
  atualizarCandidato,
  buscarCandidato,
  criarCandidato,
  listarCandidatos,
  registrarConsentimento,
} from './candidatosService'
import type { Candidato, CandidatoEntrada } from './tipos'

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}))

const apiMock = vi.mocked(api, true)

const CANDIDATO: Candidato = {
  id: 3,
  nome: 'Maria Souza',
  email: 'maria.souza@exemplo.test',
  telefone: '(83) 99999-0000',
  dataNascimento: '1988-03-14',
  status: 'CADASTRADO',
}

const ENTRADA: CandidatoEntrada = {
  nome: 'Maria Souza',
  email: 'maria.souza@exemplo.test',
  telefone: '(83) 99999-0000',
  dataNascimento: '1988-03-14',
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

describe('candidatosService', () => {
  it('lista os candidatos do estudo e manda o filtro de status para a API', async () => {
    apiMock.get.mockResolvedValue({ data: { content: [CANDIDATO], number: 0, size: 100, totalElements: 1, totalPages: 1 } })

    await expect(listarCandidatos(7, 'ELEGIVEL')).resolves.toEqual([CANDIDATO])
    expect(apiMock.get).toHaveBeenCalledWith('/estudos/7/candidatos', { params: { size: 100, status: 'ELEGIVEL' } })

    await listarCandidatos(7)
    expect(apiMock.get).toHaveBeenLastCalledWith('/estudos/7/candidatos', { params: { size: 100 } })
  })

  it('busca, cria e atualiza nas rotas do estudo', async () => {
    apiMock.get.mockResolvedValue({ data: CANDIDATO })
    apiMock.post.mockResolvedValue({ data: CANDIDATO })
    apiMock.put.mockResolvedValue({ data: CANDIDATO })

    await buscarCandidato(7, 3)
    await criarCandidato(7, ENTRADA)
    await atualizarCandidato(7, 3, ENTRADA)

    expect(apiMock.get).toHaveBeenCalledWith('/estudos/7/candidatos/3')
    expect(apiMock.post).toHaveBeenCalledWith('/estudos/7/candidatos', ENTRADA)
    expect(apiMock.put).toHaveBeenCalledWith('/estudos/7/candidatos/3', ENTRADA)
  })

  it('leva os erros de validação (400) para os campos', async () => {
    apiMock.post.mockRejectedValue(
      erroDaApi(400, {
        codigo: 'VALIDACAO',
        mensagem: 'Dados inválidos',
        detalhes: [{ campo: 'dataNascimento', mensagem: 'A data de nascimento é obrigatória' }],
      }),
    )

    const erro = (await criarCandidato(7, ENTRADA).catch((e: unknown) => e)) as ErroCandidatoApi
    expect(erro).toBeInstanceOf(ErroCandidatoApi)
    expect(erro.errosCampos).toEqual({ dataNascimento: 'A data de nascimento é obrigatória' })
  })

  it('mostra o e-mail repetido no estudo (409) no campo de e-mail', async () => {
    apiMock.post.mockRejectedValue(
      erroDaApi(409, { codigo: 'EMAIL_DUPLICADO', mensagem: 'E-mail já cadastrado neste estudo' }),
    )

    const erro = (await criarCandidato(7, ENTRADA).catch((e: unknown) => e)) as ErroCandidatoApi
    expect(erro.errosCampos).toEqual({ email: 'E-mail já cadastrado neste estudo' })
  })

  it('usa a mensagem da API quando o estudo não está em recrutamento', async () => {
    apiMock.post.mockRejectedValue(
      erroDaApi(409, { codigo: 'ESTUDO_FORA_DE_RECRUTAMENTO', mensagem: 'O estudo não está em recrutamento' }),
    )

    const erro = (await criarCandidato(7, ENTRADA).catch((e: unknown) => e)) as ErroCandidatoApi
    expect(erro.errosCampos).toEqual({})
    expect(erro.message).toBe('O estudo não está em recrutamento')
  })

  it('registra o consentimento na rota do backend e devolve o candidato atualizado', async () => {
    const comConsentimento = { ...CANDIDATO, status: 'ELEGIVEL' as const, consentimento: { registradoEm: '2026-11-04T10:00:00-03:00', registradoPor: 'Carlos Coordenador' } }
    apiMock.post.mockResolvedValue({ data: {} })
    apiMock.get.mockResolvedValue({ data: comConsentimento })

    await expect(registrarConsentimento(7, 3)).resolves.toEqual(comConsentimento)
    expect(apiMock.post).toHaveBeenCalledWith('/candidatos/3/consentimento')
    expect(apiMock.get).toHaveBeenCalledWith('/estudos/7/candidatos/3')
  })

  it('traduz a recusa do backend ao registrar consentimento duplicado', async () => {
    apiMock.post.mockRejectedValue(
      erroDaApi(409, { codigo: 'CONSENTIMENTO_JA_REGISTRADO', mensagem: 'O consentimento já foi registrado' }),
    )

    await expect(registrarConsentimento(7, 3)).rejects.toThrow('O consentimento já foi registrado')
    expect(apiMock.get).not.toHaveBeenCalled()
  })
})
