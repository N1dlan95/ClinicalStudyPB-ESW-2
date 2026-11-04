import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UsuarioCadastrado } from './tipos'
import { UsuariosListaPage } from './UsuariosListaPage'
import { listarUsuarios } from './usuariosService'

// A tela é testada sem backend: a chamada à API é simulada
vi.mock('./usuariosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./usuariosService')>()
  return { ...original, listarUsuarios: vi.fn() }
})

// Exemplos do Figma, na ordem alfabética em que a API devolve.
// Só a Pesquisadora tem datas: a API ainda não envia, os outros mostram "—".
const USUARIOS: UsuarioCadastrado[] = [
  { id: 5, nome: 'Antigo Pesquisador Demo', email: 'antigo@clinicalstudy.pb', perfil: 'PESQUISADOR', ativo: false, criadoEm: null, ultimoAcesso: null },
  { id: 1, nome: 'Coordenação Demo', email: 'coordenacao@clinicalstudy.pb', perfil: 'ADMINISTRADOR', ativo: true, criadoEm: null, ultimoAcesso: null },
  { id: 3, nome: 'Monitor Demo', email: 'monitor@clinicalstudy.pb', perfil: 'COORDENADOR', ativo: true, criadoEm: null, ultimoAcesso: null },
  { id: 4, nome: 'Participante Demo', email: 'participante@clinicalstudy.pb', perfil: 'PARTICIPANTE', ativo: true, criadoEm: null, ultimoAcesso: null },
  { id: 2, nome: 'Pesquisadora Demo', email: 'pesquisadora@clinicalstudy.pb', perfil: 'PESQUISADOR', ativo: true, criadoEm: '2026-10-15', ultimoAcesso: '2026-10-21T17:10' },
]

beforeEach(() => {
  vi.mocked(listarUsuarios).mockResolvedValue(USUARIOS)
})

function montar() {
  render(
    <MemoryRouter>
      <UsuariosListaPage />
    </MemoryRouter>,
  )
}

async function renderizar() {
  const usuario = userEvent.setup()
  montar()
  await screen.findByText('Coordenação Demo')
  return usuario
}

// Nomes das pessoas nas linhas da tabela (ignora o cabeçalho e as iniciais do avatar)
function nomesNaTabela() {
  const linhas = screen.getAllByRole('row').slice(1)
  return linhas.map((linha) => within(linha).getAllByRole('cell')[0].textContent?.slice(2))
}

describe('UsuariosListaPage', () => {
  it('mostra "Carregando" enquanto busca os usuários', async () => {
    montar()

    expect(screen.getByText('Carregando usuários…')).toBeInTheDocument()
    await screen.findByText('Coordenação Demo')
  })

  it('lista os usuários na ordem em que a API devolve', async () => {
    await renderizar()

    expect(nomesNaTabela()).toEqual(USUARIOS.map((u) => u.nome))
    expect(screen.getByText('Mostrando 5 de 5 usuários')).toBeInTheDocument()
  })

  it('mostra e-mail, perfil, status e último acesso de cada usuário', async () => {
    await renderizar()

    const linha = screen.getByText('Pesquisadora Demo').closest('tr') as HTMLElement
    expect(linha).toHaveTextContent('PD') // iniciais no avatar
    expect(linha).toHaveTextContent('pesquisadora@clinicalstudy.pb')
    expect(linha).toHaveTextContent('Pesquisador')
    expect(linha).toHaveTextContent('Ativo')
    expect(linha).toHaveTextContent('21/10/2026 · 17:10')
    expect(within(linha).getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/usuarios/2/editar')
  })

  it('mostra "—" no último acesso enquanto a API não devolve a data', async () => {
    await renderizar()

    const linha = screen.getByText('Monitor Demo').closest('tr') as HTMLElement
    expect(within(linha).getAllByRole('cell')[4]).toHaveTextContent('—')
  })

  it('tem o botão para cadastrar um novo usuário', async () => {
    await renderizar()

    expect(screen.getByRole('link', { name: '+ Novo usuário' })).toHaveAttribute('href', '/usuarios/novo')
  })

  it('busca por nome ou e-mail, sem diferenciar maiúsculas', async () => {
    const usuario = await renderizar()

    await usuario.type(screen.getByRole('searchbox'), 'MONITOR')

    expect(nomesNaTabela()).toEqual(['Monitor Demo'])
    expect(screen.getByText('Mostrando 1 de 5 usuários')).toBeInTheDocument()
  })

  it('filtra por perfil', async () => {
    const usuario = await renderizar()

    await usuario.selectOptions(screen.getByDisplayValue('Todos os perfis'), 'PESQUISADOR')

    expect(nomesNaTabela()).toEqual(['Antigo Pesquisador Demo', 'Pesquisadora Demo'])
  })

  it('filtra por status', async () => {
    const usuario = await renderizar()

    await usuario.selectOptions(screen.getByDisplayValue('Todos os status'), 'inativos')

    expect(nomesNaTabela()).toEqual(['Antigo Pesquisador Demo'])
    expect(screen.getByText('Inativo', { selector: '.selo' })).toBeInTheDocument()
  })

  it('avisa quando nenhum usuário corresponde aos filtros', async () => {
    const usuario = await renderizar()

    await usuario.type(screen.getByRole('searchbox'), 'ninguém com esse nome')

    expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 0 de 5 usuários')).toBeInTheDocument()
  })

  it('mostra uma mensagem de erro quando não consegue carregar', async () => {
    vi.mocked(listarUsuarios).mockRejectedValueOnce(new Error('sem conexão'))
    montar()

    expect(
      await screen.findByText('Não foi possível carregar os usuários. Verifique sua conexão.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument()
  })
})
