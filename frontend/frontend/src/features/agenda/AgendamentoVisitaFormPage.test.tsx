import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { listarCandidatos } from '../candidatos/candidatosService'
import type { Candidato } from '../candidatos/tipos'
import { buscarEstudo, listarVisitasPrevistas } from '../estudos/estudosService'
import type { Estudo, VisitaPrevista } from '../estudos/tipos'
import { AgendamentoVisitaFormPage } from './AgendamentoVisitaFormPage'
import { agendarVisita, listarVisitasAgendadas } from './agendaService'
import type { VisitaAgendada } from './tipos'

vi.mock('../estudos/estudosService', () => ({
  buscarEstudo: vi.fn(),
  listarVisitasPrevistas: vi.fn(),
}))
vi.mock('../candidatos/candidatosService', () => ({
  listarCandidatos: vi.fn(),
}))
vi.mock('./agendaService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./agendaService')>()
  return {
    ...original,
    listarVisitasAgendadas: vi.fn(),
    agendarVisita: vi.fn(),
  }
})

const ESTUDO: Estudo = {
  id: 1,
  titulo: 'Estudo da vacina A',
  objetivo: 'Avaliar a resposta imune',
  responsavel: { id: 2, nome: 'Ana Pesquisadora' },
  dataInicio: '2026-11-10',
  dataFim: null,
  limiteParticipantes: 30,
  estado: 'EXECUCAO',
}

const CANDIDATOS: Candidato[] = [
  {
    id: 10,
    nome: 'Maria Souza',
    email: 'maria@exemplo.test',
    telefone: null,
    dataNascimento: '1990-05-10',
    status: 'INCLUIDO',
    dataInclusao: '2027-01-10',
  },
  {
    id: 11,
    nome: 'Carlos Elegível',
    email: 'carlos@exemplo.test',
    telefone: null,
    dataNascimento: '1988-02-20',
    status: 'ELEGIVEL',
    dataInclusao: null,
  },
]

const VISITAS_PREVISTAS: VisitaPrevista[] = [
  {
    id: 100,
    ordem: 1,
    nome: 'Visita de retorno D15',
    diaPrevisto: 15,
    janelaDias: 2,
    descricao: null,
    atividades: [],
  },
]

function renderizar(rota = '/estudos/1/agenda/novo') {
  const usuario = userEvent.setup()
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/estudos/:id/agenda" element={<h1>Agenda do estudo</h1>} />
        <Route path="/estudos/:id/agenda/novo" element={<AgendamentoVisitaFormPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return usuario
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO)
  vi.mocked(listarCandidatos).mockResolvedValue(CANDIDATOS)
  vi.mocked(listarVisitasPrevistas).mockResolvedValue(VISITAS_PREVISTAS)
  vi.mocked(listarVisitasAgendadas).mockResolvedValue([])
})

describe('AgendamentoVisitaFormPage', () => {
  it('preenche automaticamente a data sugerida a partir da inclusão e da visita prevista (R2-02)', async () => {
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Agendar visita' })).toBeInTheDocument()
    // D0 = 10/01/2027 + 15 dias = 25/01/2027
    const campoData = screen.getByLabelText(/Data da visita/i)
    expect(campoData).toHaveValue('2027-01-25')
    expect(screen.getByText('23/01/2027 a 27/01/2027')).toBeInTheDocument()
    expect(screen.getByText('Dentro da janela')).toBeInTheDocument()
  })

  it('mostra aviso quando a data escolhida está fora da janela prevista do protocolo (R2-03)', async () => {
    const usuario = renderizar()
    await screen.findByRole('heading', { name: 'Agendar visita' })

    const campoData = screen.getByLabelText(/Data da visita/i)
    await usuario.clear(campoData)
    await usuario.type(campoData, '2027-02-02')

    expect(
      screen.getByText(/Aviso: data fora da janela prevista do protocolo/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Fora da janela prevista')).toBeInTheDocument()
  })

  it('exibe os estados de erro: participante não incluído, data no passado e visita já agendada (R2-05)', async () => {
    const existente: VisitaAgendada = {
      id: 501,
      estudoId: 1,
      participante: {
        id: 10,
        nome: 'Maria Souza',
        email: 'maria@exemplo.test',
        status: 'INCLUIDO',
        dataInclusao: '2027-01-10',
      },
      visitaPrevista: {
        id: 100,
        ordem: 1,
        nome: 'Visita de retorno D15',
        diaPrevisto: 15,
        janelaDias: 2,
      },
      dataAgendada: '2027-01-25',
      horaAgendada: '09:00',
      dataSugerida: '2027-01-25',
      janelaInicio: '2027-01-23',
      janelaFim: '2027-01-27',
      foraDaJanela: false,
      local: null,
      observacoes: null,
      status: 'AGENDADA',
      motivoCancelamento: null,
    }
    vi.mocked(listarVisitasAgendadas).mockResolvedValueOnce([existente])

    const usuario = renderizar()
    await screen.findByRole('heading', { name: 'Agendar visita' })

    // 1. Tenta agendar visita que já está agendada para Maria Souza + data no passado
    const campoData = screen.getByLabelText(/Data da visita/i)
    await usuario.clear(campoData)
    await usuario.type(campoData, '2020-01-10')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))

    expect(screen.getAllByText(/Visita já agendada/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Data no passado/i).length).toBeGreaterThan(0)
    expect(agendarVisita).not.toHaveBeenCalled()

    // 2. Seleciona candidato que ainda não foi incluído (Carlos Elegível)
    await usuario.selectOptions(screen.getByLabelText(/Participante \*/i), '11')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))

    expect(screen.getAllByText(/Participante não incluído/i).length).toBeGreaterThan(0)
  })

  it('envia o agendamento válido e retorna para a agenda do estudo', async () => {
    vi.mocked(agendarVisita).mockResolvedValueOnce({} as VisitaAgendada)
    const usuario = renderizar()
    await screen.findByRole('heading', { name: 'Agendar visita' })

    await usuario.click(screen.getByRole('button', { name: 'Confirmar agendamento' }))

    expect(agendarVisita).toHaveBeenCalledWith(
      1,
      {
        participanteId: 10,
        visitaPrevistaId: 100,
        dataAgendada: '2027-01-25',
        horaAgendada: '09:00',
        local: 'Ambulatório Central · Sala 204',
        observacoes: null,
      },
      expect.objectContaining({
        participanteNome: 'Maria Souza',
        visitaNome: 'Visita de retorno D15',
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Agenda do estudo' })).toBeInTheDocument()
  })
})
