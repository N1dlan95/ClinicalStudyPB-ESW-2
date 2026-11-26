import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import { ErroVisitaApi } from '../visitas/visitasService'
import { SolicitacoesEstudoPage } from './SolicitacoesEstudoPage'
import { aprovarSolicitacao, listarSolicitacoes, recusarSolicitacao } from './solicitacoesService'
import type { Solicitacao } from './tipos'

vi.mock('./solicitacoesService', () => ({
  listarSolicitacoes: vi.fn(),
  aprovarSolicitacao: vi.fn(),
  recusarSolicitacao: vi.fn(),
}))
vi.mock('../estudos/estudosService', () => ({ buscarEstudo: vi.fn() }))
vi.mock('../estudos/AbasEstudo', () => ({ AbasEstudo: () => null }))

const estudo = {
  id: 3,
  titulo: 'Estudo do Sono',
  estado: 'EXECUCAO',
  limiteParticipantes: 10,
  responsavel: { id: 1, nome: 'Pesquisadora' },
} as unknown as Estudo

const reagendamento: Solicitacao = {
  id: 1,
  tipo: 'REAGENDAMENTO',
  status: 'PENDENTE',
  participante: { candidatoId: 7, nome: 'Adrielly Melo', email: 'adrielly@exemplo.test' },
  visita: { id: 12, nome: 'Retorno', dataHora: '2026-12-02T09:00:00', local: 'Sala 2' },
  motivo: 'Viagem a trabalho',
  dataSugerida: '2026-12-09',
  criadaEm: '2026-11-24T10:30:00',
  decididaEm: null,
  decididaPor: null,
  justificativa: null,
}

const retirada: Solicitacao = {
  ...reagendamento,
  id: 2,
  tipo: 'RETIRADA',
  participante: { candidatoId: 8, nome: 'Bruno Lima', email: 'bruno@exemplo.test' },
  visita: null,
  motivo: 'Mudança de cidade',
  dataSugerida: null,
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/estudos/3/solicitacoes']}>
      <Routes>
        <Route path="/estudos/:estudoId/solicitacoes" element={<SolicitacoesEstudoPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

function linhaDe(nome: string) {
  return screen.getByText(nome).closest('tr') as HTMLElement
}

describe('SolicitacoesEstudoPage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.mocked(listarSolicitacoes).mockReset()
    vi.mocked(aprovarSolicitacao).mockReset()
    vi.mocked(recusarSolicitacao).mockReset()
    vi.mocked(buscarEstudo).mockResolvedValue(estudo)
  })

  it('abre nas pendentes e mostra participante, visita, motivo e data sugerida', async () => {
    vi.mocked(listarSolicitacoes).mockResolvedValue([reagendamento, retirada])
    renderizar()
    expect(await screen.findByText('Adrielly Melo')).not.toBeNull()
    expect(listarSolicitacoes).toHaveBeenCalledWith(3, { status: 'PENDENTE', tipo: undefined })
    const linha = linhaDe('Adrielly Melo')
    expect(within(linha).getByText('Retorno')).not.toBeNull()
    expect(within(linha).getByText(/02\/12\/2026 às 09:00 · Sala 2/)).not.toBeNull()
    expect(within(linha).getByText('Sugerida: 09/12/2026')).not.toBeNull()
    expect(within(linha).getByText('Viagem a trabalho')).not.toBeNull()
    expect(screen.getByText('Mostrando 2 de 2 solicitações')).not.toBeNull()
  })

  it('envia os filtros de status e tipo para a API', async () => {
    vi.mocked(listarSolicitacoes).mockResolvedValue([])
    renderizar()
    await screen.findByText('Nenhuma solicitação pendente')
    fireEvent.click(screen.getByRole('button', { name: 'Recusadas' }))
    await waitFor(() => expect(listarSolicitacoes).toHaveBeenLastCalledWith(3, { status: 'RECUSADA', tipo: undefined }))
    fireEvent.change(screen.getByLabelText('Filtrar por tipo'), { target: { value: 'RETIRADA' } })
    await waitFor(() => expect(listarSolicitacoes).toHaveBeenLastCalledWith(3, { status: 'RECUSADA', tipo: 'RETIRADA' }))
    expect(await screen.findByText('Nenhuma solicitação encontrada')).not.toBeNull()
  })

  it('mostra o estado de erro e tenta de novo', async () => {
    vi.mocked(listarSolicitacoes)
      .mockRejectedValueOnce(new ErroVisitaApi('Não foi possível falar com o servidor. Tente novamente.', null, null))
      .mockResolvedValueOnce([reagendamento])
    renderizar()
    expect(await screen.findByText('Não foi possível carregar as solicitações')).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText('Adrielly Melo')).not.toBeNull()
  })

  it('aprova a solicitação, mostra a mensagem de sucesso e tira da lista de pendentes', async () => {
    vi.mocked(listarSolicitacoes).mockResolvedValue([reagendamento, retirada])
    vi.mocked(aprovarSolicitacao).mockResolvedValue({ ...reagendamento, status: 'APROVADA', decididaPor: 'Carla' })
    renderizar()
    await screen.findByText('Adrielly Melo')
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar solicitação de Adrielly Melo' }))
    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByText(/remarcada para a data sugerida \(09\/12\/2026\)/)).not.toBeNull()
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar aprovação' }))
    expect(await screen.findByText(/Reagendamento de Adrielly Melo aprovado/)).not.toBeNull()
    expect(aprovarSolicitacao).toHaveBeenCalledWith(1)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Aprovar solicitação de Adrielly Melo' })).toBeNull()
    expect(screen.getByText('Ver na agenda').getAttribute('href')).toBe('/estudos/3/agenda')
  })

  it('exige justificativa para recusar e envia o texto informado', async () => {
    vi.mocked(listarSolicitacoes).mockResolvedValue([retirada])
    vi.mocked(recusarSolicitacao).mockResolvedValue({ ...retirada, status: 'RECUSADA', justificativa: 'Fim do estudo' })
    renderizar()
    await screen.findByText('Bruno Lima')
    fireEvent.click(screen.getByRole('button', { name: 'Recusar solicitação de Bruno Lima' }))
    const dialogo = screen.getByRole('dialog')
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar recusa' }))
    expect(within(dialogo).getByText('Informe a justificativa da recusa.')).not.toBeNull()
    expect(recusarSolicitacao).not.toHaveBeenCalled()

    fireEvent.change(within(dialogo).getByLabelText(/Justificativa da recusa/), { target: { value: '  Fim do estudo ' } })
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar recusa' }))
    expect(await screen.findByText('Solicitação de retirada de Bruno Lima recusada.')).not.toBeNull()
    expect(recusarSolicitacao).toHaveBeenCalledWith(2, 'Fim do estudo')
  })

  it('mostra o erro da API no diálogo e oferece atualizar quando já foi decidida', async () => {
    vi.mocked(listarSolicitacoes).mockResolvedValue([retirada])
    vi.mocked(aprovarSolicitacao).mockRejectedValue(
      new ErroVisitaApi('Outra pessoa da equipe já decidiu esta solicitação.', 409, 'SOLICITACAO_JA_DECIDIDA'),
    )
    renderizar()
    await screen.findByText('Bruno Lima')
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar solicitação de Bruno Lima' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aprovação' }))
    expect(await screen.findByText('Solicitação já decidida.')).not.toBeNull()

    vi.mocked(listarSolicitacoes).mockResolvedValue([])
    fireEvent.click(screen.getByRole('button', { name: 'Atualizar a lista' }))
    expect(await screen.findByText('Nenhuma solicitação pendente')).not.toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('mantém o diálogo aberto com a mensagem de erro em outros códigos', async () => {
    vi.mocked(listarSolicitacoes).mockResolvedValue([reagendamento])
    vi.mocked(aprovarSolicitacao).mockRejectedValue(
      new ErroVisitaApi('A visita já foi realizada.', 409, 'VISITA_NAO_AGENDADA'),
    )
    renderizar()
    await screen.findByText('Adrielly Melo')
    fireEvent.click(screen.getByRole('button', { name: 'Aprovar solicitação de Adrielly Melo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar aprovação' }))
    const dialogo = await screen.findByRole('dialog')
    expect(await within(dialogo).findByText('A visita já foi realizada.')).not.toBeNull()
    expect(within(dialogo).getByRole('button', { name: 'Confirmar aprovação' })).not.toBeNull()
  })

  it('com o estudo encerrado, só consulta', async () => {
    vi.mocked(buscarEstudo).mockResolvedValue({ ...estudo, estado: 'ENCERRADO' } as Estudo)
    vi.mocked(listarSolicitacoes).mockResolvedValue([reagendamento])
    renderizar()
    expect(await screen.findByText('Estudo encerrado.')).not.toBeNull()
    expect(screen.queryByRole('button', { name: /Aprovar solicitação/ })).toBeNull()
  })
})
