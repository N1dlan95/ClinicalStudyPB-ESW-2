import { cleanup, render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErroVisitaApi } from '../visitas/visitasService'
import { HistoricoParticipantePage } from './HistoricoParticipantePage'
import { buscarHistorico, registrarRetirada } from './historicoService'
import type { Historico } from './tipos'

vi.mock('./historicoService', () => ({ buscarHistorico: vi.fn(), registrarRetirada: vi.fn() }))

let perfilCoordenador = true
vi.mock('../auth/useAutorizacao', () => ({
  useAutorizacao: () => ({
    pode: (p: string) => (['registrarResultados', 'gerenciarCandidatos', 'registrarRetirada'].includes(p) ? perfilCoordenador : true),
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
    vi.mocked(registrarRetirada).mockReset()
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

  it('permite tentar de novo depois de um erro de servidor', async () => {
    vi.mocked(buscarHistorico).mockRejectedValueOnce(new ErroVisitaApi('Sem conexão.', null, null))
    vi.mocked(buscarHistorico).mockResolvedValueOnce(historico)
    renderizar()
    fireEvent.click(await screen.findByText('Tentar de novo'))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Paula Andrade' })).not.toBeNull())
  })

  describe('retirada (RF16)', () => {
    const retirado: Historico = {
      ...historico,
      participante: {
        ...historico.participante,
        status: 'RETIRADO',
        retirada: { registradaEm: '2026-11-23T10:00:00', registradaPor: 'Carla Coordenadora', motivo: 'Mudou de cidade' },
      },
    }

    it('só o coordenador vê o botão, e só para participante incluído', async () => {
      vi.mocked(buscarHistorico).mockResolvedValue(historico)
      renderizar()
      expect(await screen.findByText('Registrar retirada')).not.toBeNull()
      cleanup()

      perfilCoordenador = false
      renderizar()
      await screen.findByRole('heading', { name: 'Paula Andrade' })
      expect(screen.queryByText('Registrar retirada')).toBeNull()
      cleanup()

      perfilCoordenador = true
      vi.mocked(buscarHistorico).mockResolvedValue(retirado)
      renderizar()
      await screen.findByRole('heading', { name: 'Paula Andrade' })
      expect(screen.queryByText('Registrar retirada')).toBeNull()
    })

    it('exige o motivo antes de enviar', async () => {
      vi.mocked(buscarHistorico).mockResolvedValue(historico)
      renderizar()
      fireEvent.click(await screen.findByText('Registrar retirada'))
      expect(screen.getByText(/As visitas agendadas serão canceladas/)).not.toBeNull()
      fireEvent.click(screen.getByText('Confirmar retirada'))
      expect(screen.getByText('Informe o motivo da retirada.')).not.toBeNull()
      expect(registrarRetirada).not.toHaveBeenCalled()
    })

    it('registra a retirada, recarrega o histórico e mostra o resumo', async () => {
      vi.mocked(buscarHistorico).mockResolvedValueOnce(historico).mockResolvedValueOnce(retirado)
      vi.mocked(registrarRetirada).mockResolvedValue({ visitasCanceladas: 1, vagasOcupadas: 2, limiteParticipantes: 5 })
      renderizar()
      fireEvent.click(await screen.findByText('Registrar retirada'))
      fireEvent.change(screen.getByLabelText(/Motivo da retirada/), { target: { value: 'Mudou de cidade' } })
      fireEvent.click(screen.getByText('Confirmar retirada'))

      expect(await screen.findByText(/Retirada registrada\. 1 visita agendada foi cancelada\. Vagas ocupadas: 2 de 5/)).not.toBeNull()
      expect(registrarRetirada).toHaveBeenCalledWith(7, 'Mudou de cidade')
      await waitFor(() => expect(screen.queryByText('Registrar retirada')).toBeNull())
      expect(screen.getByText('Participante retirado', { selector: 'strong' })).not.toBeNull()
      expect(screen.queryByRole('dialog')).toBeNull()
    })

    it('mostra o diálogo de "já retirado" e atualiza a página', async () => {
      vi.mocked(buscarHistorico).mockResolvedValueOnce(historico).mockResolvedValueOnce(retirado)
      vi.mocked(registrarRetirada).mockRejectedValue(
        new ErroVisitaApi('Outra pessoa da equipe registrou a retirada.', 409, 'PARTICIPANTE_JA_RETIRADO'),
      )
      renderizar()
      fireEvent.click(await screen.findByText('Registrar retirada'))
      fireEvent.change(screen.getByLabelText(/Motivo da retirada/), { target: { value: 'Desistiu' } })
      fireEvent.click(screen.getByText('Confirmar retirada'))

      expect(await screen.findByText(/Participante já retirado\./)).not.toBeNull()
      expect(screen.getByText('Fechar')).not.toBeNull()
      fireEvent.click(screen.getByText('Atualizar a página'))
      await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
      await waitFor(() => expect(screen.getByText('Participante retirado', { selector: 'strong' })).not.toBeNull())
    })

    it('mantém o diálogo aberto com a mensagem quando a API recusa', async () => {
      vi.mocked(buscarHistorico).mockResolvedValue(historico)
      vi.mocked(registrarRetirada).mockRejectedValue(new ErroVisitaApi('Seu perfil não tem permissão.', 403, 'SEM_PERMISSAO'))
      renderizar()
      fireEvent.click(await screen.findByText('Registrar retirada'))
      fireEvent.change(screen.getByLabelText(/Motivo da retirada/), { target: { value: 'Desistiu' } })
      fireEvent.click(screen.getByText('Confirmar retirada'))
      expect(await screen.findByText('Seu perfil não tem permissão.')).not.toBeNull()
      expect(screen.getByRole('dialog')).not.toBeNull()
    })
  })
})
