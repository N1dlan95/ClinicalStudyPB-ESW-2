import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { Perfil, Sessao } from '../auth/tipos'
import { EstudosListaPage } from './EstudosListaPage'
import { ErroEstudoApi, listarEstudos } from './estudosService'
import type { Estudo } from './tipos'

// Task 3236: a tela é testada sem backend; a chamada à API é simulada
vi.mock('./estudosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./estudosService')>()
  return { ...original, listarEstudos: vi.fn() }
})

const VACINA: Estudo = {
  id: 1,
  titulo: 'Estudo da vacina A',
  objetivo: 'Avaliar a resposta imune',
  responsavel: { id: 2, nome: 'Ana Pesquisadora' },
  dataInicio: '2026-11-10',
  dataFim: '2027-05-10',
  limiteParticipantes: 30,
  estado: 'RECRUTAMENTO',
}

const PRESSAO: Estudo = {
  id: 2,
  titulo: 'Estudo de pressão arterial',
  objetivo: 'Comparar dois tratamentos',
  responsavel: { id: 5, nome: 'Bruno Pesquisador' },
  dataInicio: '2026-12-01',
  dataFim: null,
  limiteParticipantes: 1,
  estado: 'ENCERRADO',
}

function renderizarComo(perfil: Perfil) {
  const sessao: Sessao = {
    token: 'token-de-teste',
    usuario: { id: 2, nome: 'Usuário de teste', email: 'teste@clinicalstudypb.test', perfil },
  }
  localStorage.setItem('clinicalstudypb.sessao', JSON.stringify(sessao))
  const usuario = userEvent.setup()
  render(
    <AuthProvider>
      <MemoryRouter>
        <EstudosListaPage />
      </MemoryRouter>
    </AuthProvider>,
  )
  return usuario
}

beforeEach(() => {
  vi.mocked(listarEstudos).mockResolvedValue([VACINA, PRESSAO])
})

describe('EstudosListaPage', () => {
  it('mostra cada estudo com responsável, período, vagas e estado', async () => {
    renderizarComo('PESQUISADOR')

    expect(await screen.findByText('Estudo da vacina A')).toBeInTheDocument()
    expect(screen.getByText('Ana Pesquisadora')).toBeInTheDocument()
    expect(screen.getByText('10/11/2026 – 10/05/2027')).toBeInTheDocument()
    expect(screen.getByText('30 vagas')).toBeInTheDocument()
    expect(screen.getByText('Recrutamento', { selector: 'span' })).toBeInTheDocument()
    // Sem data de término e com uma vaga só
    expect(screen.getByText('01/12/2026 – sem data')).toBeInTheDocument()
    expect(screen.getByText('1 vaga')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 2 de 2 estudos')).toBeInTheDocument()
  })

  it('mostra o carregamento enquanto a API não responde', () => {
    vi.mocked(listarEstudos).mockReturnValue(new Promise(() => {}))
    renderizarComo('PESQUISADOR')

    expect(screen.getByText('Carregando estudos…')).toBeInTheDocument()
  })

  it('libera cadastrar e editar para o pesquisador, menos para estudo encerrado', async () => {
    renderizarComo('PESQUISADOR')

    await screen.findByText('Estudo da vacina A')
    expect(screen.getByRole('link', { name: '+ Novo estudo' })).toHaveAttribute('href', '/estudos/novo')
    const editar = screen.getAllByRole('link', { name: 'Editar' })
    expect(editar).toHaveLength(1)
    expect(editar[0]).toHaveAttribute('href', '/estudos/1/editar')
    expect(screen.queryByRole('link', { name: 'Candidatos' })).not.toBeInTheDocument()
  })

  it('mostra só o acesso aos candidatos para o coordenador', async () => {
    renderizarComo('COORDENADOR')

    await screen.findByText('Estudo da vacina A')
    expect(screen.queryByRole('link', { name: '+ Novo estudo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Candidatos' })[0]).toHaveAttribute('href', '/estudos/1/candidatos')
  })

  it('deixa o administrador só consultar', async () => {
    renderizarComo('ADMINISTRADOR')

    await screen.findByText('Estudo da vacina A')
    expect(screen.queryByRole('link', { name: '+ Novo estudo' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Candidatos' })).not.toBeInTheDocument()
  })

  it('filtra pelo texto da busca, sem diferenciar maiúsculas', async () => {
    const usuario = renderizarComo('PESQUISADOR')

    await screen.findByText('Estudo da vacina A')
    await usuario.type(screen.getByPlaceholderText('Buscar por título, objetivo ou responsável'), 'BRUNO')

    expect(screen.queryByText('Estudo da vacina A')).not.toBeInTheDocument()
    expect(screen.getByText('Estudo de pressão arterial')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 1 de 2 estudos')).toBeInTheDocument()
  })

  it('filtra pelo estado e avisa quando nada combina', async () => {
    const usuario = renderizarComo('PESQUISADOR')

    await screen.findByText('Estudo da vacina A')
    await usuario.selectOptions(screen.getByRole('combobox'), 'ENCERRADO')
    expect(screen.queryByText('Estudo da vacina A')).not.toBeInTheDocument()
    expect(screen.getByText('Estudo de pressão arterial')).toBeInTheDocument()

    await usuario.selectOptions(screen.getByRole('combobox'), 'PLANEJAMENTO')
    expect(screen.getByText('Nenhum estudo encontrado.')).toBeInTheDocument()
  })

  it('mostra a mensagem de erro quando a API falha', async () => {
    vi.mocked(listarEstudos).mockRejectedValueOnce(
      new ErroEstudoApi('Seu perfil não tem permissão para esta ação.', 403, 'SEM_PERMISSAO', {}),
    )
    renderizarComo('PESQUISADOR')

    expect(
      await screen.findByText('Não foi possível carregar os estudos. Seu perfil não tem permissão para esta ação.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Nenhum estudo encontrado.')).toBeInTheDocument()
  })
})
