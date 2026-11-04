import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { ErroLogin, MENSAGEM_LOGIN, entrarNaApi } from './authService'
import { LoginPage } from './LoginPage'

// A tela é testada sem backend: a chamada à API é simulada
vi.mock('./authService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./authService')>()
  return { ...original, entrarNaApi: vi.fn() }
})

function renderizar() {
  const usuario = userEvent.setup()
  render(
    <AuthProvider>
      <LoginPage />
    </AuthProvider>,
  )
  return {
    usuario,
    campoEmail: screen.getByLabelText('E-mail'),
    campoSenha: screen.getByLabelText('Senha'),
    botaoEntrar: screen.getByRole('button', { name: 'Entrar' }),
  }
}

describe('LoginPage', () => {
  it('mostra os campos de e-mail e senha e o botão Entrar', () => {
    const { campoEmail, campoSenha, botaoEntrar } = renderizar()

    expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
    expect(campoEmail).toHaveAttribute('type', 'email')
    expect(campoSenha).toHaveAttribute('type', 'password')
    expect(botaoEntrar).toBeInTheDocument()
  })

  it('não mostra erros antes de tentar entrar', () => {
    renderizar()

    expect(screen.queryByText('Informe o e-mail.')).not.toBeInTheDocument()
    expect(screen.queryByText('Informe a senha.')).not.toBeInTheDocument()
  })

  it('mostra os dois erros ao tentar entrar com os campos vazios', async () => {
    const { usuario, campoEmail, campoSenha, botaoEntrar } = renderizar()

    await usuario.click(botaoEntrar)

    expect(screen.getByText('Informe o e-mail.')).toBeInTheDocument()
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument()
    expect(campoEmail).toHaveAttribute('aria-invalid', 'true')
    expect(campoSenha).toHaveAttribute('aria-invalid', 'true')
  })

  it('liga a mensagem de erro ao campo para leitores de tela', async () => {
    const { usuario, campoEmail, botaoEntrar } = renderizar()

    await usuario.click(botaoEntrar)

    expect(campoEmail).toHaveAccessibleDescription('Informe o e-mail.')
  })

  it('avisa quando o e-mail é inválido', async () => {
    const { usuario, campoEmail, campoSenha, botaoEntrar } = renderizar()

    await usuario.type(campoEmail, 'pesquisadora@')
    await usuario.type(campoSenha, 'segredo')
    await usuario.click(botaoEntrar)

    expect(screen.getByText('Informe um e-mail válido.')).toBeInTheDocument()
    expect(screen.queryByText('Informe a senha.')).not.toBeInTheDocument()
  })

  it('tira o erro do campo assim que a pessoa volta a digitar nele', async () => {
    const { usuario, campoEmail, botaoEntrar } = renderizar()

    await usuario.click(botaoEntrar)
    await usuario.type(campoEmail, 'p')

    expect(screen.queryByText('Informe o e-mail.')).not.toBeInTheDocument()
    expect(campoEmail).toHaveAttribute('aria-invalid', 'false')
    // o erro da senha continua, porque ela ainda não foi preenchida
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument()
  })

  it('não mostra erros quando e-mail e senha estão preenchidos corretamente', async () => {
    vi.mocked(entrarNaApi).mockReturnValueOnce(new Promise(() => {}))
    const { usuario, campoEmail, campoSenha, botaoEntrar } = renderizar()

    await usuario.type(campoEmail, 'pesquisadora@clinicalstudy.pb')
    await usuario.type(campoSenha, 'segredo')
    await usuario.click(botaoEntrar)

    expect(campoEmail).toHaveAttribute('aria-invalid', 'false')
    expect(campoSenha).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText(/Informe/)).not.toBeInTheDocument()
  })

  it('não chama a API quando os campos estão inválidos', async () => {
    const { usuario, botaoEntrar } = renderizar()

    await usuario.click(botaoEntrar)

    expect(entrarNaApi).not.toHaveBeenCalled()
  })
})

describe('LoginPage – integração com a API', () => {
  async function preencherEEntrar(email = 'pesquisadora@clinicalstudy.pb', senha = 'segredo') {
    const tela = renderizar()
    await tela.usuario.type(tela.campoEmail, email)
    await tela.usuario.type(tela.campoSenha, senha)
    await tela.usuario.click(tela.botaoEntrar)
    return tela
  }

  it('envia e-mail e senha e salva a sessão quando o login dá certo', async () => {
    const sessao = {
      token: 'token-jwt',
      usuario: { id: 2, nome: 'Ana Pesquisadora', email: 'pesquisadora@clinicalstudy.pb', perfil: 'PESQUISADOR' as const },
    }
    vi.mocked(entrarNaApi).mockResolvedValueOnce(sessao)

    await preencherEEntrar()

    expect(entrarNaApi).toHaveBeenCalledWith('pesquisadora@clinicalstudy.pb', 'segredo')
    expect(JSON.parse(localStorage.getItem('clinicalstudypb.sessao') ?? 'null')).toEqual(sessao)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('mostra "Entrando…" e bloqueia o botão enquanto espera a resposta', async () => {
    vi.mocked(entrarNaApi).mockReturnValueOnce(new Promise(() => {}))

    await preencherEEntrar()

    expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled()
  })

  it('mostra o aviso e destaca a senha quando e-mail ou senha estão incorretos', async () => {
    vi.mocked(entrarNaApi).mockRejectedValueOnce(new ErroLogin(MENSAGEM_LOGIN.credenciais, true))

    const { campoSenha } = await preencherEEntrar()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail ou senha incorretos. Confira os dados e tente novamente.',
    )
    expect(campoSenha).toHaveAccessibleDescription('Senha inválida.')
    expect(campoSenha).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled()
    expect(localStorage.getItem('clinicalstudypb.sessao')).toBeNull()
  })

  it.each([
    ['usuário inativo', MENSAGEM_LOGIN.inativo],
    ['participante', MENSAGEM_LOGIN.participante],
    ['sem conexão', MENSAGEM_LOGIN.semConexao],
  ])('mostra a mensagem de %s', async (_caso, mensagem) => {
    vi.mocked(entrarNaApi).mockRejectedValueOnce(new ErroLogin(mensagem))

    const { campoSenha } = await preencherEEntrar()

    expect(await screen.findByRole('alert')).toHaveTextContent(mensagem)
    expect(campoSenha).toHaveAttribute('aria-invalid', 'false')
  })

  it('mostra uma mensagem genérica para erros inesperados', async () => {
    vi.mocked(entrarNaApi).mockRejectedValueOnce(new TypeError('falha qualquer'))

    await preencherEEntrar()

    expect(await screen.findByRole('alert')).toHaveTextContent(MENSAGEM_LOGIN.inesperado)
  })
})
