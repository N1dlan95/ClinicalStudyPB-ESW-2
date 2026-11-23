import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import { ExigePermissao } from '../auth/RotaProtegida'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import { AcoesVisitaPage } from './AcoesVisitaPage'
import { buscarVisitaAgendada, registrarExecucaoVisita } from './agendaService'
import type { VisitaAgendada } from './tipos'

vi.mock('../estudos/estudosService', () => ({ buscarEstudo: vi.fn() }))
vi.mock('./agendaService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./agendaService')>()
  return {
    ...original,
    buscarVisitaAgendada: vi.fn(),
    registrarExecucaoVisita: vi.fn(),
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

const VISITA: VisitaAgendada = {
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
}

function renderizar() {
  const usuario = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/estudos/1/agenda/501/acoes']}>
      <Routes>
        <Route path="/estudos/:id/agenda" element={<h1>Agenda do estudo</h1>} />
        <Route path="/estudos/:id/agenda/:visitaId/acoes" element={<AcoesVisitaPage />} />
      </Routes>
    </MemoryRouter>,
  )
  return usuario
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO)
  vi.mocked(buscarVisitaAgendada).mockResolvedValue(VISITA)
})

describe('AcoesVisitaPage', () => {
  it('permite registrar a visita como Realizada ou Ausente (R2-04)', async () => {
    vi.mocked(registrarExecucaoVisita).mockResolvedValueOnce({ ...VISITA, status: 'REALIZADA' })
    const usuario = renderizar()

    expect(await screen.findByText('Maria Souza')).toBeInTheDocument()
    expect(screen.getByText('Visita de triagem')).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Confirmar como realizada' }))

    expect(registrarExecucaoVisita).toHaveBeenCalledWith(1, 501, {
      status: 'REALIZADA',
      observacoes: null,
      motivoCancelamento: null,
    })
    expect(await screen.findByRole('heading', { name: 'Agenda do estudo' })).toBeInTheDocument()
  })

  it('exige motivo obrigatório ao selecionar Cancelar visita (R2-06)', async () => {
    vi.mocked(registrarExecucaoVisita).mockResolvedValueOnce({
      ...VISITA,
      status: 'CANCELADA',
      motivoCancelamento: 'Solicitação de reagendamento pelo participante',
    })
    const usuario = renderizar()
    await screen.findByText('Maria Souza')

    await usuario.click(screen.getByRole('button', { name: /Cancelar/i }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))

    expect(screen.getAllByText(/Motivo obrigatório/i).length).toBeGreaterThan(0)
    expect(registrarExecucaoVisita).not.toHaveBeenCalled()

    await usuario.type(
      screen.getByLabelText(/Motivo do cancelamento \*/i),
      'Solicitação de reagendamento pelo participante',
    )
    await usuario.click(screen.getByRole('button', { name: 'Confirmar cancelamento' }))

    expect(registrarExecucaoVisita).toHaveBeenCalledWith(1, 501, {
      status: 'CANCELADA',
      observacoes: null,
      motivoCancelamento: 'Solicitação de reagendamento pelo participante',
    })
    expect(await screen.findByRole('heading', { name: 'Agenda do estudo' })).toBeInTheDocument()
  })

  it('bloqueia o pesquisador com Acesso negado na rota protegida de ações da visita', () => {
    render(
      <AuthContext.Provider
        value={{
          usuario: {
            id: 2,
            nome: 'Ana Pesquisadora',
            email: 'pesquisador@clinicalstudypb.test',
            perfil: 'PESQUISADOR',
          },
          token: 't',
          autenticado: true,
          entrar: () => {},
          sair: () => {},
        }}
      >
        <MemoryRouter initialEntries={['/estudos/1/agenda/501/acoes']}>
          <Routes>
            <Route
              path="/estudos/:id/agenda/:visitaId/acoes"
              element={
                <ExigePermissao permissao="gerenciarVisitas">
                  <AcoesVisitaPage />
                </ExigePermissao>
              }
            />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument()
    expect(screen.getByText(/alterar o estado das visitas/i)).toBeInTheDocument()
  })
})
