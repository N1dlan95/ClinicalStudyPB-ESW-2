import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import { CandidatosListaPage } from './CandidatosListaPage'
import { ErroCandidatoApi, contarIncluidos, incluirCandidato, listarCandidatos } from './candidatosService'
import type { Candidato } from './tipos'

vi.mock('../estudos/estudosService', () => ({ buscarEstudo: vi.fn() }))
vi.mock('./candidatosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./candidatosService')>()
  return { ...original, listarCandidatos: vi.fn(), contarIncluidos: vi.fn(), incluirCandidato: vi.fn() }
})

const ESTUDO: Estudo = {
  id: 7,
  titulo: 'Estudo de adesão ao tratamento',
  objetivo: 'Avaliar a adesão',
  responsavel: { id: 2, nome: 'Ana Pesquisadora' },
  dataInicio: '2026-11-10',
  dataFim: null,
  limiteParticipantes: 40,
  estado: 'RECRUTAMENTO',
}

const CANDIDATOS: Candidato[] = [
  { id: 1, nome: 'Maria Souza', email: 'maria@exemplo.test', telefone: null, dataNascimento: '1988-03-14', status: 'ELEGIVEL' },
  { id: 3, nome: 'Ana Ribeiro', email: 'ana@exemplo.test', telefone: null, dataNascimento: '1995-05-22', status: 'ELEGIVEL', consentimento: { registradoEm: '2026-11-03', registradoPor: 'Carlos Coordenador' } },
  { id: 2, nome: 'João Lima', email: 'joao@exemplo.test', telefone: '(83) 99999-0000', dataNascimento: '1990-01-02', status: 'CADASTRADO' },
]

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/estudos/7/candidatos']}>
      <Routes>
        <Route path="/estudos/:estudoId/candidatos" element={<CandidatosListaPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO)
  vi.mocked(listarCandidatos).mockResolvedValue(CANDIDATOS)
  vi.mocked(contarIncluidos).mockResolvedValue(18)
})

describe('CandidatosListaPage', () => {
  it('lista os candidatos do estudo com status e link de edição', async () => {
    renderizar()

    const linha = (await screen.findByText('Maria Souza')).closest('tr')!
    expect(within(linha).getByText('Elegível')).toBeInTheDocument()
    expect(within(linha).getByText('Pendente')).toBeInTheDocument()
    expect(within(linha).getByRole('link', { name: 'Ver detalhes' })).toHaveAttribute('href', '/estudos/7/candidatos/1')
    expect(screen.getByText('Mostrando 3 de 3 candidatos')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Novo candidato' })).toHaveAttribute('href', '/estudos/7/candidatos/novo')
  })

  it('filtra por status pela API', async () => {
    renderizar()
    await screen.findByText('Maria Souza')

    await userEvent.click(screen.getByRole('button', { name: 'Elegível' }))

    expect(listarCandidatos).toHaveBeenLastCalledWith(7, 'ELEGIVEL')
    expect(screen.getByRole('button', { name: 'Elegível' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('busca por nome ou e-mail na própria tela', async () => {
    renderizar()
    await screen.findByText('Maria Souza')

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por nome ou e-mail' }), 'joao@')

    expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument()
    expect(screen.getByText('João Lima')).toBeInTheDocument()
  })

  it('bloqueia o cadastro quando o estudo não está em recrutamento', async () => {
    vi.mocked(buscarEstudo).mockResolvedValue({ ...ESTUDO, estado: 'PLANEJAMENTO' })
    renderizar()

    expect(await screen.findByText(/Estudo fora de recrutamento/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Novo candidato' })).toBeDisabled()
  })

  it('mostra o erro quando a API falha', async () => {
    vi.mocked(listarCandidatos).mockRejectedValue(new Error('Não foi possível falar com o servidor. Tente novamente.'))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar os candidatos.')
  })

  it('mostra o contador de vagas e o botão Incluir só para quem já pode ser incluído', async () => {
    renderizar()

    expect(await screen.findByText('18 de 40 vagas')).toBeInTheDocument()
    expect(screen.getByText('22 livres')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Incluir Ana Ribeiro' })).toBeEnabled()
    // Maria está elegível, mas sem consentimento; João ainda não foi avaliado
    expect(screen.queryByRole('button', { name: 'Incluir Maria Souza' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Incluir João Lima' })).not.toBeInTheDocument()
  })

  it('inclui após confirmar e atualiza o contador e o status', async () => {
    vi.mocked(incluirCandidato).mockResolvedValue({ vagasOcupadas: 19, limiteParticipantes: 40 })
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Incluir Ana Ribeiro' }))
    expect(screen.getByRole('dialog', { name: 'Incluir no estudo?' })).toHaveTextContent('19 de 40 depois da inclusão')
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar inclusão' }))

    expect(incluirCandidato).toHaveBeenCalledWith(3)
    expect(await screen.findByText('19 de 40 vagas')).toBeInTheDocument()
    expect(within(screen.getByText('Ana Ribeiro').closest('tr')!).getByText('Incluído')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Vagas ocupadas: 19 de 40')
  })

  it('desabilita o Incluir quando as vagas estão esgotadas', async () => {
    vi.mocked(contarIncluidos).mockResolvedValue(40)
    renderizar()

    expect(await screen.findByText('esgotadas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Incluir Ana Ribeiro' })).toBeDisabled()
  })

  it('mostra a mensagem específica do bloqueio devolvido pela API', async () => {
    vi.mocked(incluirCandidato).mockRejectedValue(
      new ErroCandidatoApi('Não há vagas disponíveis no estudo', 409, 'VAGAS_ESGOTADAS', {}),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Incluir Ana Ribeiro' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar inclusão' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Vagas esgotadas. Não há vagas disponíveis no estudo')
  })
})
