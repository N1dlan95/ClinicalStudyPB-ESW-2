import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { Sessao } from '../auth/tipos'
import { UsuarioFormPage } from './UsuarioFormPage'
import { UsuariosListaPage } from './UsuariosListaPage'
import { criarUsuario } from './usuariosService'

// Usa o serviço com dados fictícios de verdade, mas permite simular falhas no cadastro
vi.mock('./usuariosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./usuariosService')>()
  return { ...original, criarUsuario: vi.fn(original.criarUsuario) }
})

const ADMIN_LOGADO: Sessao = {
  token: 'token-de-teste',
  usuario: { id: 1, nome: 'Coordenação Demo', email: 'coordenacao@clinicalstudy.pb', perfil: 'ADMINISTRADOR' },
}

function renderizar(endereco: string) {
  localStorage.setItem('clinicalstudypb.sessao', JSON.stringify(ADMIN_LOGADO))
  const usuario = userEvent.setup()
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[endereco]}>
        <Routes>
          <Route path="/usuarios" element={<UsuariosListaPage />} />
          <Route path="/usuarios/novo" element={<UsuarioFormPage />} />
          <Route path="/usuarios/:id/editar" element={<UsuarioFormPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  return usuario
}

const campoNome = () => screen.getByRole('textbox', { name: 'Nome completo' })
const campoEmail = () => screen.getByRole('textbox', { name: 'E-mail' })
const botaoCadastrar = () => screen.getByRole('button', { name: 'Cadastrar usuário' })

describe('UsuarioFormPage – cadastro', () => {
  it('mostra os campos do Figma com os valores iniciais', () => {
    renderizar('/usuarios/novo')

    expect(screen.getByRole('heading', { name: 'Novo usuário' })).toBeInTheDocument()
    expect(campoNome()).toHaveValue('')
    expect(campoEmail()).toHaveAccessibleDescription('Usado para login. Precisa ser único.')
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(screen.getByRole('checkbox', { name: /Enviar convite por e-mail/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Usuário ativo' })).toBeChecked()
  })

  it('mostra o erro de cada campo e o aviso com a lista ao enviar vazio', async () => {
    const usuario = renderizar('/usuarios/novo')

    await usuario.click(botaoCadastrar())

    expect(screen.getByText('Corrija 3 campos para cadastrar o usuário:')).toBeInTheDocument()
    expect(campoNome()).toHaveAccessibleDescription('Informe o nome completo.')
    expect(campoNome()).toHaveAttribute('aria-invalid', 'true')
    expect(campoEmail()).toHaveAccessibleDescription('Informe o e-mail.')
    expect(screen.getByRole('radiogroup', { name: 'Perfil de acesso' })).toHaveAccessibleDescription(
      'Selecione o perfil de acesso.',
    )
  })

  it('mostra o aviso de campo destacado quando só um campo está errado', async () => {
    const usuario = renderizar('/usuarios/novo')

    await usuario.type(campoNome(), 'Ana')
    await usuario.type(campoEmail(), 'ana@clinicalstudy.pb')
    await usuario.click(screen.getByRole('radio', { name: /Pesquisador/ }))
    await usuario.click(botaoCadastrar())

    expect(
      screen.getByText('Não foi possível cadastrar o usuário. Corrija o campo destacado.'),
    ).toBeInTheDocument()
    expect(campoNome()).toHaveAccessibleDescription('Informe nome e sobrenome.')
  })

  it('tira o erro do campo assim que a pessoa volta a digitar nele', async () => {
    const usuario = renderizar('/usuarios/novo')

    await usuario.click(botaoCadastrar())
    await usuario.type(campoNome(), 'A')

    expect(campoNome()).toHaveAttribute('aria-invalid', 'false')
    expect(screen.queryByText('Informe o nome completo.')).not.toBeInTheDocument()
    // os outros erros continuam
    expect(screen.getByText('Informe o e-mail.')).toBeInTheDocument()
  })

  it('avisa quando o e-mail já pertence a outro usuário e mostra o link para ele', async () => {
    const usuario = renderizar('/usuarios/novo')

    await usuario.type(campoNome(), 'Ana Souza')
    await usuario.type(campoEmail(), 'PESQUISADORA@clinicalstudy.pb')
    await usuario.click(screen.getByRole('radio', { name: /Pesquisador/ }))
    await usuario.click(botaoCadastrar())

    expect(
      await screen.findByText('Este e-mail já está cadastrado para outro usuário.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Não foi possível cadastrar o usuário. Corrija o campo destacado.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver usuário existente' })).toHaveAttribute(
      'href',
      '/usuarios/2/editar',
    )
  })

  it('mostra uma mensagem quando o cadastro falha por outro motivo', async () => {
    vi.mocked(criarUsuario).mockRejectedValueOnce(new Error('servidor fora do ar'))
    const usuario = renderizar('/usuarios/novo')

    await usuario.type(campoNome(), 'Ana Souza')
    await usuario.type(campoEmail(), 'ana@clinicalstudy.pb')
    await usuario.click(screen.getByRole('radio', { name: /Coordenador/ }))
    await usuario.click(botaoCadastrar())

    expect(
      await screen.findByText('Não foi possível cadastrar o usuário. Tente novamente.'),
    ).toBeInTheDocument()
  })

  it('cadastra o usuário e volta para a listagem', async () => {
    const usuario = renderizar('/usuarios/novo')

    await usuario.type(campoNome(), 'Bruno Lima')
    await usuario.type(campoEmail(), 'bruno@clinicalstudy.pb')
    await usuario.click(screen.getByRole('radio', { name: /Coordenador/ }))
    await usuario.click(screen.getByRole('checkbox', { name: 'Usuário ativo' }))
    await usuario.click(botaoCadastrar())

    expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeInTheDocument()
    const linha = (await screen.findByText('Bruno Lima')).closest('tr')
    expect(linha).toHaveTextContent('bruno@clinicalstudy.pb')
    expect(linha).toHaveTextContent('Coordenador')
    expect(linha).toHaveTextContent('Inativo')
  })
})

describe('UsuarioFormPage – edição', () => {
  it('carrega os dados do usuário', async () => {
    renderizar('/usuarios/3/editar')

    expect(await screen.findByRole('heading', { name: 'Editar usuário' })).toBeInTheDocument()
    expect(campoNome()).toHaveValue('Monitor Demo')
    expect(campoEmail()).toHaveValue('monitor@clinicalstudy.pb')
    expect(screen.getByRole('radio', { name: /Coordenador/ })).toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('ativo')
    expect(screen.getByText(/Último acesso 20\/10\/2026 às 10:05/)).toBeInTheDocument()
  })

  it('desativa o usuário e salva', async () => {
    const usuario = renderizar('/usuarios/3/editar')

    await usuario.selectOptions(await screen.findByRole('combobox', { name: 'Status' }), 'inativo')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    const linha = (await screen.findByText('Monitor Demo')).closest('tr')
    expect(linha).toHaveTextContent('Inativo')
  })

  it('não deixa o administrador desativar o próprio usuário', async () => {
    renderizar('/usuarios/1/editar')

    const status = await screen.findByRole('combobox', { name: 'Status' })
    expect(status).toBeDisabled()
    expect(status).toHaveAccessibleDescription('Você não pode desativar o próprio usuário.')
  })

  it('não acusa e-mail duplicado quando o usuário mantém o próprio e-mail', async () => {
    const usuario = renderizar('/usuarios/2/editar')

    await usuario.click(await screen.findByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('heading', { name: 'Usuários' })).toBeInTheDocument()
  })

  it('envia o link para redefinir a senha', async () => {
    const usuario = renderizar('/usuarios/2/editar')

    await usuario.click(await screen.findByRole('button', { name: 'Enviar link para redefinir senha' }))

    expect(
      await screen.findByText('Link enviado para pesquisadora@clinicalstudy.pb.'),
    ).toBeInTheDocument()
  })
})
