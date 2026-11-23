import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { Sessao } from '../auth/tipos'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import { AgendaEstudoPage } from './AgendaEstudoPage'
import { ErroAgendaApi, listarVisitasAgendadas } from './agendaService'
import type { VisitaAgendada } from './tipos'

vi.mock('../estudos/estudosService', () => ({ buscarEstudo: vi.fn() }))
vi.mock('./agendaService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./agendaService')>()
  return { ...original, listarVisitasAgendadas: vi.fn() }
})

const ESTUDO: Estudo = {
  id: 1,
  titulo: 'Estudo da vacina A',
  objetivo: 'Avaliar a resposta imune',
  responsavel: { id: 2, nome: 'Ana Pesquisadora' },
  dataInicio: '2026-11-10',
  dataFim: '2027-05-10',
  limiteParticipantes: 30,
  estado: 'EXECUCAO',
}

const VISITAS: VisitaAgendada[] = [
  {
    id: 501,
    estudoId: 1,
    participante: {
      id: 10,
      nome: 'Maria Souza',
      email: 'maria@exemplo.test',
      status: 'INCLUIDO',
      dataInclusao: '2026-11-10',
    },
    visitaPrevista: {
      id: 100,
      ordem: 1,
      nome: 'Visita de triagem',
      diaPrevisto: 0,
      janelaDias: 2,
    },
    dataAgendada: '2026-11-25',
    horaAgendada: '09:00',
    dataSugerida: '2026-11-25',
    janelaInicio: '2026-11-23',
    janelaFim: '2026-11-27',
    foraDaJanela: false,
    local: 'Ambulatório Central · Sala 204',
    observacoes: null,
    status: 'AGENDADA',
    motivoCancelamento: null,
  },
  {
    id: 502,
    estudoId: 1,
    participante: {
      id: 11,
      nome: 'João Lima',
      email: 'joao@exemplo.test',
      status: 'INCLUIDO',
      dataInclusao: '2026-11-10',
    },
    visitaPrevista: {
      id: 101,
      ordem: 2,
      nome: 'Retorno D15',
      diaPrevisto: 15,
      janelaDias: 2,
    },
    dataAgendada: '2026-12-02',
    horaAgendada: '14:30',
    dataSugerida: '2026-11-25',
    janelaInicio: '2026-11-23',
    janelaFim: '2026-11-27',
    foraDaJanela: true,
    local: 'Ambulatório Central · Sala 204',
    observacoes: null,
    status: 'CANCELADA',
    motivoCancelamento: 'Solicitação do participante',
  },
]

function renderizar(perfil: 'COORDENADOR' | 'PESQUISADOR' = 'COORDENADOR') {
  const sessao: Sessao = {
    token: 'token-de-teste',
    usuario: {
      id: perfil === 'COORDENADOR' ? 3 : 2,
      nome: perfil === 'COORDENADOR' ? 'Carlos Coordenador' : 'Ana Pesquisadora',
      email:
        perfil === 'COORDENADOR'
          ? 'coordenador@clinicalstudypb.test'
          : 'pesquisador@clinicalstudypb.test',
      perfil,
    },
  }
  localStorage.setItem('clinicalstudypb.sessao', JSON.stringify(sessao))
  const usuario = userEvent.setup()
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/estudos/1/agenda']}>
        <Routes>
          <Route path="/estudos/:id/agenda" element={<AgendaEstudoPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  return usuario
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO)
  vi.mocked(listarVisitasAgendadas).mockResolvedValue(VISITAS)
})

describe('AgendaEstudoPage', () => {
  it('exibe o estado carregando enquanto busca os dados (R2-08)', () => {
    vi.mocked(listarVisitasAgendadas).mockReturnValue(new Promise(() => {}))
    renderizar()

    expect(screen.getByText('Carregando agenda do estudo…')).toBeInTheDocument()
  })

  it('exibe o estado vazio quando não há visitas agendadas (R2-07)', async () => {
    vi.mocked(listarVisitasAgendadas).mockResolvedValueOnce([])
    renderizar()

    expect(await screen.findByText('Nenhuma visita agendada encontrada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Agendar primeira visita' })).toHaveAttribute(
      'href',
      '/estudos/1/agenda/novo',
    )
  })

  it('lista visitas com participante, visita prevista, data/hora, janela e status (R2-01)', async () => {
    renderizar()

    const linhaMaria = (await screen.findByText('Maria Souza')).closest('tr')!
    expect(within(linhaMaria).getByText('Visita de triagem')).toBeInTheDocument()
    expect(within(linhaMaria).getByText('25/11/2026 às 09:00')).toBeInTheDocument()
    expect(within(linhaMaria).getByText('Agendada')).toBeInTheDocument()
    expect(
      within(linhaMaria).getByRole('link', { name: 'Registrar ação na visita de Maria Souza' }),
    ).toHaveAttribute('href', '/estudos/1/agenda/501/acoes')

    const linhaJoao = screen.getByText('João Lima').closest('tr')!
    expect(within(linhaJoao).getByText('Fora da janela')).toBeInTheDocument()
    expect(within(linhaJoao).getByText('Cancelada')).toBeInTheDocument()
    expect(within(linhaJoao).getByText('Motivo: Solicitação do participante')).toBeInTheDocument()
  })

  it('filtra por status e por busca textual', async () => {
    const usuario = renderizar()
    await screen.findByText('Maria Souza')

    await usuario.type(
      screen.getByRole('searchbox', { name: 'Buscar por participante, e-mail ou visita prevista' }),
      'João',
    )
    expect(screen.queryByText('Maria Souza')).not.toBeInTheDocument()
    expect(screen.getByText('João Lima')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Agendada' }))
    expect(listarVisitasAgendadas).toHaveBeenLastCalledWith(1, 'AGENDADA')
  })

  it('oculta a ação de mudar estado da visita para o pesquisador (somente consulta)', async () => {
    renderizar('PESQUISADOR')

    const linhaMaria = (await screen.findByText('Maria Souza')).closest('tr')!
    expect(
      within(linhaMaria).queryByRole('link', { name: /Registrar ação/i }),
    ).not.toBeInTheDocument()
    expect(within(linhaMaria).getByText('Somente consulta')).toBeInTheDocument()
  })

  // T-108B: botões por perfil, estado de erro e estado vazio sem ação para quem só consulta
  it('o coordenador vê o agendamento e a ação de cada visita', async () => {
    renderizar('COORDENADOR')

    const linhaMaria = (await screen.findByText('Maria Souza')).closest('tr')!
    expect(screen.getByRole('link', { name: '+ Agendar visita' })).toHaveAttribute('href', '/estudos/1/agenda/novo')
    expect(
      within(linhaMaria).getByRole('link', { name: 'Registrar ação na visita de Maria Souza' }),
    ).toHaveAttribute('href', '/estudos/1/agenda/501/acoes')
  })

  it('o pesquisador não vê o botão de agendar', async () => {
    renderizar('PESQUISADOR')

    await screen.findByText('Maria Souza')
    expect(screen.queryByRole('link', { name: '+ Agendar visita' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '+ Agendar visita' })).not.toBeInTheDocument()
  })

  it('no estado vazio, só o coordenador vê "Agendar primeira visita"', async () => {
    vi.mocked(listarVisitasAgendadas).mockResolvedValue([])
    renderizar('PESQUISADOR')

    expect(await screen.findByText(/ainda não possui visitas agendadas/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '+ Agendar primeira visita' })).not.toBeInTheDocument()
  })

  it('com o estudo encerrado, o botão de agendar fica desabilitado', async () => {
    vi.mocked(buscarEstudo).mockResolvedValue({ ...ESTUDO, estado: 'ENCERRADO' })
    renderizar('COORDENADOR')

    await screen.findByText('Maria Souza')
    expect(screen.getByRole('button', { name: '+ Agendar visita' })).toBeDisabled()
  })

  it('mostra o erro quando a agenda não carrega', async () => {
    vi.mocked(listarVisitasAgendadas).mockRejectedValue(new ErroAgendaApi('Estudo não encontrado.', 404, 'NAO_ENCONTRADO'))
    renderizar('COORDENADOR')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar a agenda do estudo. Estudo não encontrado.',
    )
  })
})
