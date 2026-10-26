import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import {
  EmailDuplicadoError,
  atualizarUsuario,
  buscarUsuario,
  criarUsuario,
  enviarLinkRedefinicaoSenha,
  listarUsuarios,
} from './usuariosService'

vi.mock('../../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() },
}))

const apiMock = vi.mocked(api, true)

// Usuário como a API devolve hoje (UsuarioResponse, sem as datas)
const DA_API = {
  id: 3,
  nome: 'Monitor Demo',
  email: 'monitor@clinicalstudy.pb',
  matricula: null,
  perfil: 'COORDENADOR',
  ativo: true,
}

const ESPERADO = {
  id: 3,
  nome: 'Monitor Demo',
  email: 'monitor@clinicalstudy.pb',
  perfil: 'COORDENADOR',
  ativo: true,
  criadoEm: null,
  ultimoAcesso: null,
}

const ENTRADA = { nome: 'Monitor Demo', email: 'monitor@clinicalstudy.pb', perfil: 'COORDENADOR' as const }

function pagina<T>(content: T[]) {
  return { data: { content, number: 0, size: 100, totalElements: content.length, totalPages: 1 } }
}

// Monta o erro que o axios devolve quando o backend responde com o corpo de erro da API
function erroDaApi(status: number, codigo: string) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('erro', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    headers: {},
    config,
    data: { status, codigo, mensagem: 'texto do backend', detalhes: [] },
  })
}

describe('listarUsuarios', () => {
  it('chama GET /usuarios pedindo até 100 e devolve o conteúdo da página', async () => {
    apiMock.get.mockResolvedValueOnce(pagina([DA_API]))

    expect(await listarUsuarios()).toEqual([ESPERADO])
    expect(apiMock.get).toHaveBeenCalledWith('/usuarios', { params: { size: 100 } })
  })

  it('aproveita as datas quando a API passar a enviá-las', async () => {
    apiMock.get.mockResolvedValueOnce(
      pagina([{ ...DA_API, criadoEm: '2026-10-15', ultimoAcesso: '2026-10-21T17:10' }]),
    )

    const [usuario] = await listarUsuarios()

    expect(usuario.criadoEm).toBe('2026-10-15')
    expect(usuario.ultimoAcesso).toBe('2026-10-21T17:10')
  })
})

describe('buscarUsuario', () => {
  it('chama GET /usuarios/{id}', async () => {
    apiMock.get.mockResolvedValueOnce({ data: DA_API })

    expect(await buscarUsuario(3)).toEqual(ESPERADO)
    expect(apiMock.get).toHaveBeenCalledWith('/usuarios/3')
  })
})

describe('criarUsuario', () => {
  it('chama POST /usuarios com nome, e-mail, perfil e senha', async () => {
    apiMock.post.mockResolvedValueOnce({ data: DA_API })

    expect(await criarUsuario({ ...ENTRADA, ativo: true, senha: 'Senha@123' })).toEqual(ESPERADO)
    expect(apiMock.post).toHaveBeenCalledWith('/usuarios', { ...ENTRADA, senha: 'Senha@123' })
    expect(apiMock.patch).not.toHaveBeenCalled()
  })

  it('desativa logo depois de criar quando o usuário deve começar inativo', async () => {
    apiMock.post.mockResolvedValueOnce({ data: DA_API })
    apiMock.patch.mockResolvedValueOnce({ data: { ...DA_API, ativo: false } })

    const criado = await criarUsuario({ ...ENTRADA, ativo: false, senha: 'Senha@123' })

    expect(apiMock.patch).toHaveBeenCalledWith('/usuarios/3/status', { ativo: false })
    expect(criado.ativo).toBe(false)
  })

  it('traduz EMAIL_DUPLICADO e descobre quem já usa o e-mail', async () => {
    apiMock.post.mockRejectedValueOnce(erroDaApi(409, 'EMAIL_DUPLICADO'))
    apiMock.get.mockResolvedValueOnce(
      pagina([
        { ...DA_API, id: 8, email: 'monitor.antigo@clinicalstudy.pb' },
        { ...DA_API, id: 3 },
      ]),
    )

    const erro = await criarUsuario({ ...ENTRADA, email: 'MONITOR@clinicalstudy.pb', ativo: true, senha: 'Senha@123' }).catch(
      (e: unknown) => e,
    )

    expect(erro).toBeInstanceOf(EmailDuplicadoError)
    expect((erro as EmailDuplicadoError).usuarioExistenteId).toBe(3)
    expect(apiMock.get).toHaveBeenCalledWith('/usuarios', {
      params: { busca: 'MONITOR@clinicalstudy.pb', size: 100 },
    })
  })

  it('traduz EMAIL_DUPLICADO mesmo se não conseguir descobrir o dono do e-mail', async () => {
    apiMock.post.mockRejectedValueOnce(erroDaApi(409, 'EMAIL_DUPLICADO'))
    apiMock.get.mockRejectedValueOnce(new Error('falhou'))

    const erro = await criarUsuario({ ...ENTRADA, ativo: true, senha: 'Senha@123' }).catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(EmailDuplicadoError)
    expect((erro as EmailDuplicadoError).usuarioExistenteId).toBeNull()
  })

  it('repassa os outros erros sem traduzir', async () => {
    const erroServidor = erroDaApi(500, 'ERRO_INTERNO')
    apiMock.post.mockRejectedValueOnce(erroServidor)

    await expect(criarUsuario({ ...ENTRADA, ativo: true, senha: 'Senha@123' })).rejects.toBe(erroServidor)
  })
})

describe('atualizarUsuario', () => {
  it('chama PUT /usuarios/{id} sem senha e sem status', async () => {
    apiMock.put.mockResolvedValueOnce({ data: DA_API })

    await atualizarUsuario(3, { ...ENTRADA, ativo: true })

    expect(apiMock.put).toHaveBeenCalledWith('/usuarios/3', ENTRADA)
    expect(apiMock.patch).not.toHaveBeenCalled()
  })

  it('chama a rota de status só quando ele muda', async () => {
    apiMock.put.mockResolvedValueOnce({ data: DA_API })
    apiMock.patch.mockResolvedValueOnce({ data: { ...DA_API, ativo: false } })

    const atualizado = await atualizarUsuario(3, { ...ENTRADA, ativo: false })

    expect(apiMock.patch).toHaveBeenCalledWith('/usuarios/3/status', { ativo: false })
    expect(atualizado.ativo).toBe(false)
  })

  it('traduz EMAIL_DUPLICADO na edição', async () => {
    apiMock.put.mockRejectedValueOnce(erroDaApi(409, 'EMAIL_DUPLICADO'))
    apiMock.get.mockResolvedValueOnce(pagina([{ ...DA_API, id: 5, email: 'antigo@clinicalstudy.pb' }]))

    const erro = await atualizarUsuario(3, { ...ENTRADA, email: 'antigo@clinicalstudy.pb', ativo: true }).catch(
      (e: unknown) => e,
    )

    expect((erro as EmailDuplicadoError).usuarioExistenteId).toBe(5)
  })
})

describe('enviarLinkRedefinicaoSenha', () => {
  it('chama POST /usuarios/{id}/redefinir-senha', async () => {
    apiMock.post.mockResolvedValueOnce({ data: null })

    await enviarLinkRedefinicaoSenha(2)

    expect(apiMock.post).toHaveBeenCalledWith('/usuarios/2/redefinir-senha')
  })
})
