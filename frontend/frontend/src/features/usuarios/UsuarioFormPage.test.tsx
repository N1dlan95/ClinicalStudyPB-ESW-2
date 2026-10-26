import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { Sessao } from '../auth/tipos'
import type { UsuarioCadastrado } from './tipos'
import { UsuarioFormPage } from './UsuarioFormPage'
import {
  EmailDuplicadoError,
  atualizarUsuario,
  buscarUsuario,
  criarUsuario,
  enviarLinkRedefinicaoSenha,
} from './usuariosService'

// A tela é testada sem backend: as chamadas à API são simuladas
vi.mock('./usuariosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./usuariosService')>()
  return {
    ...original,
    buscarUsuario: vi.fn(),
    criarUsuario: vi.fn(),
    atualizarUsuario: vi.fn(),
    enviarLinkRedefinicaoSenha: vi.fn(),
  }
})

const PESQUISADORA: UsuarioCadastrado = {
  id: 2,
  nome: 'Pesquisadora Demo',
  email: 'pesquisadora@clinicalstudy.pb',
  perfil: 'PESQUISADOR',
  ativo: true,
  criadoEm: '2026-10-15',
  ultimoAcesso: '2026-10-21T17:10',
}

// Como a API devolve hoje: sem as datas
const MONITOR: UsuarioCadastrado = {
  id: 3,
  nome: 'Monitor Demo',
  email: 'monitor@clinicalstudy.pb',
  perfil: 'COORDENADOR',
  ativo: true,
  criadoEm: null,
  ultimoAcesso: null,
}

const ADMIN_LOGADO: Sessao = {
  token: 'token-de-teste',
  usuario: { id: 1, nome: 'Coordenação Demo', email: 'coordenacao@clinicalstudy.pb', perfil: 'ADMINISTRADOR' },
}

beforeEach(() => {
  vi.mocked(buscarUsuario).mockImplementation(async (id) => {
    const encontrado = [PESQUISADORA, MONITOR, { ...MONITOR, id: 1, nome: 'Coordenação Demo' }].find(
      (u) => u.id === id,
    )
    if (!encontrado) throw new Error('Usuário não encontrado')
    return encontrado
  })
  vi.mocked(criarUsuario).mockImplementation(async (dados) => ({
    ...dados,
    id: 100,
    criadoEm: null,
    ultimoAcesso: null,
  }))
  vi.mocked(atualizarUsuario).mockImplementation(async (id, dados) => ({ ...MONITOR, ...dados, id }))
})

function renderizar(endereco: string) {
  localStorage.setItem('clinicalstudypb.sessao', JSON.stringify(ADMIN_LOGADO))
  const usuario = userEvent.setup()
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[endereco]}>
        <Routes>
          <Route path="/usuarios" element={<h1>Lista de usuários</h1>} />
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
const campoSenha = () => screen.getByLabelText(/^Senha/)
const botaoCadastrar = () => screen.getByRole('button', { name: 'Cadastrar usuário' })
const voltouParaALista = () => screen.findByRole('heading', { name: 'Lista de usuários' })

describe('UsuarioFormPage – cadastro', () => {
  async function preencher(
    usuario: ReturnType<typeof userEvent.setup>,
    { nome = 'Ana Souza', email = 'ana@clinicalstudy.pb', perfil = /Pesquisador/, senha = 'Senha@123' } = {},
  ) {
    await usuario.type(campoNome(), nome)
    await usuario.type(campoEmail(), email)
    await usuario.click(screen.getByRole('radio', { name: perfil }))
    await usuario.type(campoSenha(), senha)
  }

  it('mostra os campos com os valores iniciais', () => {
    renderizar('/usuarios/novo')

    expect(screen.getByRole('heading', { name: 'Novo usuário' })).toBeInTheDocument()
    expect(campoNome()).toHaveValue('')
    expect(campoEmail()).toHaveAccessibleDescription('Usado para login. Precisa ser único.')
    expect(screen.getAllByRole('radio')).toHaveLength(4)
    expect(campoSenha()).toHaveAttribute('type', 'password')
    expect(campoSenha()).toHaveAccessibleDescription('Mínimo de 8 caracteres.')
    expect(screen.getByRole('checkbox', { name: 'Usuário ativo' })).toBeChecked()
  })

  it('descreve os perfis com as permissões do backend', () => {
    renderizar('/usuarios/novo')

    expect(screen.getByRole('radio', { name: /Coordenador/ })).toHaveAccessibleName(
      expect.stringContaining('Acompanha os estudos'),
    )
    expect(screen.getByRole('radio', { name: /Pesquisador/ })).toHaveAccessibleName(
      expect.stringContaining('Cria e edita estudos'),
    )
  })

  it('mostra o erro de cada campo e o aviso com a lista ao enviar vazio', async () => {
    const usuario = renderizar('/usuarios/novo')

    await usuario.click(botaoCadastrar())

    expect(screen.getByText('Corrija 4 campos para cadastrar o usuário:')).toBeInTheDocument()
    expect(campoNome()).toHaveAccessibleDescription('Informe o nome completo.')
    expect(campoNome()).toHaveAttribute('aria-invalid', 'true')
    expect(campoEmail()).toHaveAccessibleDescription('Informe o e-mail.')
    expect(screen.getByRole('radiogroup', { name: 'Perfil de acesso' })).toHaveAccessibleDescription(
      'Selecione o perfil de acesso.',
    )
    expect(campoSenha()).toHaveAccessibleDescription('Informe a senha.')
    expect(criarUsuario).not.toHaveBeenCalled()
  })

  it('mostra o aviso de campo destacado quando só um campo está errado', async () => {
    const usuario = renderizar('/usuarios/novo')

    await preencher(usuario, { senha: '1234' })
    await usuario.click(botaoCadastrar())

    expect(
      screen.getByText('Não foi possível cadastrar o usuário. Corrija o campo destacado.'),
    ).toBeInTheDocument()
    expect(campoSenha()).toHaveAccessibleDescription('A senha deve ter pelo menos 8 caracteres.')
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

  it('envia os dados com a senha e volta para a listagem', async () => {
    const usuario = renderizar('/usuarios/novo')

    await preencher(usuario, { nome: ' Bruno Lima ', email: 'bruno@clinicalstudy.pb', perfil: /Coordenador/ })
    await usuario.click(screen.getByRole('checkbox', { name: 'Usuário ativo' }))
    await usuario.click(botaoCadastrar())

    expect(await voltouParaALista()).toBeInTheDocument()
    expect(criarUsuario).toHaveBeenCalledWith({
      nome: 'Bruno Lima',
      email: 'bruno@clinicalstudy.pb',
      perfil: 'COORDENADOR',
      ativo: false,
      senha: 'Senha@123',
    })
  })

  it('avisa quando o e-mail já pertence a outro usuário e mostra o link para ele', async () => {
    vi.mocked(criarUsuario).mockRejectedValueOnce(new EmailDuplicadoError(2))
    const usuario = renderizar('/usuarios/novo')

    await preencher(usuario, { email: 'pesquisadora@clinicalstudy.pb' })
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

  it('não mostra o link quando não descobre quem já usa o e-mail', async () => {
    vi.mocked(criarUsuario).mockRejectedValueOnce(new EmailDuplicadoError(null))
    const usuario = renderizar('/usuarios/novo')

    await preencher(usuario)
    await usuario.click(botaoCadastrar())

    expect(
      await screen.findByText('Este e-mail já está cadastrado para outro usuário.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Ver usuário existente' })).not.toBeInTheDocument()
  })

  it('mostra uma mensagem quando o cadastro falha por outro motivo', async () => {
    vi.mocked(criarUsuario).mockRejectedValueOnce(new Error('servidor fora do ar'))
    const usuario = renderizar('/usuarios/novo')

    await preencher(usuario)
    await usuario.click(botaoCadastrar())

    expect(
      await screen.findByText('Não foi possível cadastrar o usuário. Tente novamente.'),
    ).toBeInTheDocument()
  })
})

describe('UsuarioFormPage – edição', () => {
  it('carrega os dados do usuário, sem campo de senha', async () => {
    renderizar('/usuarios/2/editar')

    expect(await screen.findByRole('heading', { name: 'Editar usuário' })).toBeInTheDocument()
    expect(buscarUsuario).toHaveBeenCalledWith(2)
    expect(campoNome()).toHaveValue('Pesquisadora Demo')
    expect(campoEmail()).toHaveValue('pesquisadora@clinicalstudy.pb')
    expect(screen.getByRole('radio', { name: /Pesquisador/ })).toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveValue('ativo')
    expect(screen.getByText('Cadastrado em 15/10/2026 · Último acesso 21/10/2026 às 17:10')).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Senha/)).not.toBeInTheDocument()
  })

  it('mostra "—" quando a API ainda não devolve as datas', async () => {
    renderizar('/usuarios/3/editar')

    expect(await screen.findByText('Cadastrado em — · Último acesso —')).toBeInTheDocument()
  })

  it('salva as alterações sem enviar senha e volta para a listagem', async () => {
    const usuario = renderizar('/usuarios/3/editar')

    await usuario.click(await screen.findByRole('radio', { name: /Pesquisador/ }))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'inativo')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await voltouParaALista()).toBeInTheDocument()
    expect(atualizarUsuario).toHaveBeenCalledWith(3, {
      nome: 'Monitor Demo',
      email: 'monitor@clinicalstudy.pb',
      perfil: 'PESQUISADOR',
      ativo: false,
    })
  })

  it('não deixa o administrador desativar o próprio usuário', async () => {
    renderizar('/usuarios/1/editar')

    const status = await screen.findByRole('combobox', { name: 'Status' })
    expect(status).toBeDisabled()
    expect(status).toHaveAccessibleDescription('Você não pode desativar o próprio usuário.')
  })

  it('avisa quando o e-mail novo já é de outro usuário', async () => {
    vi.mocked(atualizarUsuario).mockRejectedValueOnce(new EmailDuplicadoError(5))
    const usuario = renderizar('/usuarios/3/editar')

    await usuario.clear(await screen.findByRole('textbox', { name: 'E-mail' }))
    await usuario.type(campoEmail(), 'antigo@clinicalstudy.pb')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(
      await screen.findByText('Não foi possível salvar as alterações. Corrija o campo destacado.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver usuário existente' })).toHaveAttribute(
      'href',
      '/usuarios/5/editar',
    )
  })

  it('mostra erro ao carregar um usuário que não existe', async () => {
    renderizar('/usuarios/999/editar')

    expect(
      await screen.findByText('Não foi possível carregar o usuário. Tente novamente.'),
    ).toBeInTheDocument()
  })

  it('envia o link para redefinir a senha', async () => {
    vi.mocked(enviarLinkRedefinicaoSenha).mockResolvedValueOnce()
    const usuario = renderizar('/usuarios/2/editar')

    await usuario.click(await screen.findByRole('button', { name: 'Enviar link para redefinir senha' }))

    expect(enviarLinkRedefinicaoSenha).toHaveBeenCalledWith(2)
    expect(
      await screen.findByText('Link enviado para pesquisadora@clinicalstudy.pb.'),
    ).toBeInTheDocument()
  })

  it('avisa quando o link não pôde ser enviado (rota ainda não existe no backend)', async () => {
    vi.mocked(enviarLinkRedefinicaoSenha).mockRejectedValueOnce(new Error('404'))
    const usuario = renderizar('/usuarios/2/editar')

    await usuario.click(await screen.findByRole('button', { name: 'Enviar link para redefinir senha' }))

    expect(
      await screen.findByText('Não foi possível enviar o link. Tente novamente.'),
    ).toBeInTheDocument()
  })
})
