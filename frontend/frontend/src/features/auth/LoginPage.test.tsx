import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { LoginPage } from './LoginPage'

function renderizar() {
  const usuario = userEvent.setup()
  render(<LoginPage />)
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
    const { usuario, campoEmail, campoSenha, botaoEntrar } = renderizar()

    await usuario.type(campoEmail, 'pesquisadora@clinicalstudy.pb')
    await usuario.type(campoSenha, 'segredo')
    await usuario.click(botaoEntrar)

    expect(campoEmail).toHaveAttribute('aria-invalid', 'false')
    expect(campoSenha).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText(/Informe/)).not.toBeInTheDocument()
  })
})
