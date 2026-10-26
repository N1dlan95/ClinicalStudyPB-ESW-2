import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { UsuariosListaPage } from './UsuariosListaPage'
import { listarUsuarios } from './usuariosService'

// Usa o serviço com dados fictícios de verdade, mas permite simular falha na listagem
vi.mock('./usuariosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./usuariosService')>()
  return { ...original, listarUsuarios: vi.fn(original.listarUsuarios) }
})

async function renderizar() {
  const usuario = userEvent.setup()
  render(
    <MemoryRouter>
      <UsuariosListaPage />
    </MemoryRouter>,
  )
  await screen.findByText('Coordenação Demo')
  return usuario
}

// Nomes das pessoas nas linhas da tabela (ignora o cabeçalho)
function nomesNaTabela() {
  const linhas = screen.getAllByRole('row').slice(1)
  return linhas.map((linha) => within(linha).getAllByRole('cell')[0].textContent?.slice(2))
}

describe('UsuariosListaPage', () => {
  it('mostra "Carregando" enquanto busca os usuários', async () => {
    render(
      <MemoryRouter>
        <UsuariosListaPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('Carregando usuários…')).toBeInTheDocument()
    await screen.findByText('Coordenação Demo')
  })

  it('lista os usuários com e-mail, perfil, status e último acesso', async () => {
    await renderizar()

    expect(nomesNaTabela()).toHaveLength(5)
    expect(screen.getByText('Mostrando 5 de 5 usuários')).toBeInTheDocument()

    const linha = screen.getByText('Pesquisadora Demo').closest('tr') as HTMLElement
    expect(linha).toHaveTextContent('PD') // iniciais no avatar
    expect(linha).toHaveTextContent('pesquisadora@clinicalstudy.pb')
    expect(linha).toHaveTextContent('Pesquisador')
    expect(linha).toHaveTextContent('Ativo')
    expect(linha).toHaveTextContent('21/10/2026 · 17:10')
    expect(within(linha).getByRole('link', { name: 'Editar' })).toHaveAttribute('href', '/usuarios/2/editar')
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

    expect(nomesNaTabela()).toEqual(['Pesquisadora Demo', 'Antigo Pesquisador Demo'])
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
    render(
      <MemoryRouter>
        <UsuariosListaPage />
      </MemoryRouter>,
    )

    expect(
      await screen.findByText('Não foi possível carregar os usuários. Verifique sua conexão.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Nenhum usuário encontrado.')).toBeInTheDocument()
  })
})
