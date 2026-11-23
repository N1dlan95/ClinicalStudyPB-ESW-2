import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroVisitaApi } from '../visitas/visitasService'
import { HistoricoParticipantePage } from './HistoricoParticipantePage'
import { buscarHistorico } from './historicoService'
import type { Historico } from './tipos'

vi.mock('./historicoService', () => ({ buscarHistorico: vi.fn() }))

let perfilCoordenador = true
vi.mock('../auth/useAutorizacao', () => ({
  useAutorizacao: () => ({
    pode: (p: string) => (p === 'registrarResultados' || p === 'gerenciarCandidatos' ? perfilCoordenador : true),
  }),
}))

const historico: Historico = {
  participante: {
    candidatoId: 7,
    nome: 'Paula Andrade',
    email: 'paula@exemplo.test',
    status: 'INCLUIDO',
    dataInclusao: '2026-10-20',
    retirada: null,
  },
  estudo: { id: 3, titulo: 'Estudo do Sono' },
  visitas: [
    {
      id: 12,
      visitaPrevista: { id: 2, ordem: 1, nome: 'Triagem' },
      dataHora: '2026-10-26T09:00:00',
      local: 'Sala 2',
      status: 'REALIZADA',
      observacao: null,
      resultados: [
        { atividadeId: 4, ordem: 1, descricao: 'Aferir pressão arterial', resultado: 'PA 120x80', observacao: null, registradoEm: null, registradoPor: null },
      ],
    },
    { id: 13, visitaPrevista: { id: 3, ordem: 2, nome: 'Retorno' }, dataHora: '2026-11-26T09:00:00', local: null, status: 'AUSENTE', observacao: null, resultados: [] },
    { id: 14, visitaPrevista: { id: 4, ordem: 3, nome: 'Controle' }, dataHora: '2026-12-26T09:00:00', local: null, status: 'CANCELADA', observacao: 'Participante retirado', resultados: [] },
    { id: 15, visitaPrevista: { id: 5, ordem: 4, nome: 'Final' }, dataHora: '2027-01-26T09:00:00', local: null, status: 'AGENDADA', observacao: null, resultados: [] },
  ],
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/estudos/3/candidatos/7/historico']}>
      <Routes>
        <Route path="/estudos/:estudoId/candidatos/:id/historico" element={<HistoricoParticipantePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('HistoricoParticipantePage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.mocked(buscarHistorico).mockReset()
    perfilCoordenador = true
  })

  it('mostra cabeçalho e a linha do tempo com cada status', async () => {
    vi.mocked(buscarHistorico).mockResolvedValue(historico)
    renderizar()
    expect(await screen.findByRole('heading', { name: 'Paula Andrade' })).not.toBeNull()
    expect(screen.getByText('paula@exemplo.test')).not.toBeNull()
    expect(screen.getByText('20/10/2026')).not.toBeNull()
    expect(screen.getByText(/4 visitas/)).not.toBeNull()
    expect(screen.getByText('PA 120x80')).not.toBeNull()
    expect(screen.getByText(/o participante não compareceu/)).not.toBeNull()
    expect(screen.getByText(/Participante retirado/)).not.toBeNull()
    expect(screen.getByText(/depois que a visita for realizada/)).not.toBeNull()
    expect(screen.getByText('Ver e editar resultados').getAttribute('href')).toBe('/estudos/3/visitas/12/resultados')
  })

  it('para quem só consulta, o link da visita realizada é "Ver resultados"', async () => {
    perfilCoordenador = false
    vi.mocked(buscarHistorico).mockResolvedValue(historico)
    renderizar()
    await screen.findByRole('heading', { name: 'Paula Andrade' })
    expect(screen.queryByText('Ver e editar resultados')).toBeNull()
    expect(screen.getAllByText('Ver resultados').length).toBe(2)
  })

  it('mostra o estado vazio quando não há visitas', async () => {
    vi.mocked(buscarHistorico).mockResolvedValue({ ...historico, visitas: [] })
    renderizar()
    expect(await screen.findByText('Nenhuma visita ainda')).not.toBeNull()
  })

  it('mostra mensagem própria para candidato nunca incluído', async () => {
    vi.mocked(buscarHistorico).mockRejectedValue(new ErroVisitaApi('x', 409, 'PARTICIPANTE_NAO_INCLUIDO'))
    renderizar()
    expect(await screen.findByText(/nunca foi incluído no estudo/)).not.toBeNull()
    expect(screen.queryByText('Tentar de novo')).toBeNull()
  })

  // T-108B: participante já retirado ao abrir o histórico
  it('mostra o participante retirado com a data, quem registrou e o motivo', async () => {
    vi.mocked(buscarHistorico).mockResolvedValue({
      ...historico,
      participante: {
        ...historico.participante,
        status: 'RETIRADO',
        retirada: { registradaEm: '2026-11-23T10:00:00', registradaPor: 'Carla Coordenadora', motivo: 'Mudou de cidade' },
      },
    })
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Paula Andrade' })).not.toBeNull()
    expect(screen.getByText('Retirado', { selector: '.selo' })).not.toBeNull()
    const aviso = screen.getByText('Participante retirado', { selector: 'strong' }).parentElement!
    expect(aviso.textContent).toContain('23/11/2026 10:00')
    expect(aviso.textContent).toContain('Carla Coordenadora')
    expect(aviso.textContent).toContain('Mudou de cidade')
  })

  it('participante incluído não mostra o aviso de retirada', async () => {
    vi.mocked(buscarHistorico).mockResolvedValue(historico)
    renderizar()

    await screen.findByRole('heading', { name: 'Paula Andrade' })
    expect(screen.queryByText('Participante retirado', { selector: 'strong' })).toBeNull()
  })

  it('permite tentar de novo depois de um erro de servidor', async () => {
    vi.mocked(buscarHistorico).mockRejectedValueOnce(new ErroVisitaApi('Sem conexão.', null, null))
    vi.mocked(buscarHistorico).mockResolvedValueOnce(historico)
    renderizar()
    fireEvent.click(await screen.findByText('Tentar de novo'))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Paula Andrade' })).not.toBeNull())
  })
})
