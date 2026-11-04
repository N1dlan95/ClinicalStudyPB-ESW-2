import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import { ErroLogin, MENSAGEM_LOGIN, entrarNaApi, sairDaApi } from './authService'

vi.mock('../../services/api', () => ({ api: { post: vi.fn() } }))

const post = vi.mocked(api.post)

// Monta o erro que o axios devolve quando o backend responde com o corpo de erro da API
function erroDaApi(status: number, codigo?: string) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('erro', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: codigo ? { status, codigo, mensagem: 'texto do backend' } : undefined,
  })
}

function respostaLogin(perfil: string) {
  return {
    data: {
      token: 'token-jwt',
      tipo: 'Bearer',
      expiraEm: '2026-10-26T20:00:00Z',
      usuario: {
        id: 7,
        nome: 'Ana Pesquisadora',
        email: 'pesquisador@clinicalstudypb.test',
        matricula: 'PES-001',
        perfil,
        ativo: true,
        permissoes: ['ESTUDO_CONSULTAR'],
      },
    },
  }
}

async function erroAoEntrar(): Promise<ErroLogin> {
  try {
    await entrarNaApi('pesquisador@clinicalstudypb.test', 'Senha@123')
  } catch (erro) {
    return erro as ErroLogin
  }
  throw new Error('o login deveria ter falhado')
}

describe('entrarNaApi', () => {
  it('chama POST /auth/login e devolve a sessão com o token e o usuário', async () => {
    post.mockResolvedValueOnce(respostaLogin('PESQUISADOR'))

    const sessao = await entrarNaApi('  pesquisador@clinicalstudypb.test ', 'Senha@123')

    expect(post).toHaveBeenCalledWith('/auth/login', {
      email: 'pesquisador@clinicalstudypb.test',
      senha: 'Senha@123',
    })
    expect(sessao).toEqual({
      token: 'token-jwt',
      usuario: { id: 7, nome: 'Ana Pesquisadora', email: 'pesquisador@clinicalstudypb.test', perfil: 'PESQUISADOR' },
    })
  })

  it('traduz CREDENCIAIS_INVALIDAS e marca a senha como inválida', async () => {
    post.mockRejectedValueOnce(erroDaApi(401, 'CREDENCIAIS_INVALIDAS'))

    const erro = await erroAoEntrar()

    expect(erro).toBeInstanceOf(ErroLogin)
    expect(erro.message).toBe(MENSAGEM_LOGIN.credenciais)
    expect(erro.senhaInvalida).toBe(true)
  })

  it('traduz USUARIO_INATIVO', async () => {
    post.mockRejectedValueOnce(erroDaApi(401, 'USUARIO_INATIVO'))

    const erro = await erroAoEntrar()

    expect(erro.message).toBe(MENSAGEM_LOGIN.inativo)
    expect(erro.senhaInvalida).toBe(false)
  })

  it('avisa quando não consegue falar com o servidor', async () => {
    post.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))

    expect((await erroAoEntrar()).message).toBe(MENSAGEM_LOGIN.semConexao)
  })

  it('usa a mensagem genérica para outros erros do servidor', async () => {
    post.mockRejectedValueOnce(erroDaApi(500))

    expect((await erroAoEntrar()).message).toBe(MENSAGEM_LOGIN.inesperado)
  })

  it('recusa o participante e encerra o token que foi criado', async () => {
    post.mockResolvedValueOnce(respostaLogin('PARTICIPANTE')).mockResolvedValueOnce({ data: null })

    const erro = await erroAoEntrar()

    expect(erro.message).toBe(MENSAGEM_LOGIN.participante)
    expect(post).toHaveBeenLastCalledWith('/auth/logout', null, {
      headers: { Authorization: 'Bearer token-jwt' },
    })
  })
})

describe('sairDaApi', () => {
  it('chama POST /auth/logout com o token da sessão', async () => {
    post.mockResolvedValueOnce({ data: null })

    await sairDaApi('token-jwt')

    expect(post).toHaveBeenCalledWith('/auth/logout', null, {
      headers: { Authorization: 'Bearer token-jwt' },
    })
  })

  it('não quebra se o backend falhar', async () => {
    post.mockRejectedValueOnce(erroDaApi(401, 'NAO_AUTENTICADO'))

    await expect(sairDaApi('token-expirado')).resolves.toBeUndefined()
  })
})
