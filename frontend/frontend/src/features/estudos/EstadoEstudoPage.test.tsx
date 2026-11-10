import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { Sessao } from '../auth/tipos'
import { EstadoEstudoPage } from './EstadoEstudoPage'
import { ErroEstudoApi, alterarEstadoEstudo, buscarEstudo } from './estudosService'
import type { Estudo } from './tipos'

vi.mock('./estudosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./estudosService')>()
  return {
    ...original,
    buscarEstudo: vi.fn(),
    alterarEstadoEstudo: vi.fn(),
  }
})

const ESTUDO_RECRUTAMENTO: Estudo = {
  id: 1,
  titulo: 'Estudo da vacina A',
  objetivo: 'Avaliar a resposta imune',
  responsavel: { id: 2, nome: 'Ana Pesquisadora' },
  dataInicio: '2026-11-10',
  dataFim: '2027-05-10',
  limiteParticipantes: 30,
  estado: 'RECRUTAMENTO',
}

function renderizar() {
  const sessao: Sessao = {
    token: 'token-de-teste',
    usuario: {
      id: 2,
      nome: 'Ana Pesquisadora',
      email: 'ana@clinicalstudypb.test',
      perfil: 'PESQUISADOR',
    },
  }
  localStorage.setItem('clinicalstudypb.sessao', JSON.stringify(sessao))
  const usuario = userEvent.setup()
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/estudos/1/estado']}>
        <Routes>
          <Route path="/estudos/:id/estado" element={<EstadoEstudoPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  return usuario
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO_RECRUTAMENTO)
})

describe('EstadoEstudoPage', () => {
  it('mostra o estado atual e as transições válidas a partir de recrutamento', async () => {
    renderizar()

    expect(await screen.findByText('Fase atual: Recrutamento')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Avançar para Em execução' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retornar para Planejamento' })).toBeInTheDocument()
  })

  it('pede confirmação antes de alterar o estado e atualiza a tela', async () => {
    vi.mocked(alterarEstadoEstudo).mockResolvedValueOnce({
      ...ESTUDO_RECRUTAMENTO,
      estado: 'EXECUCAO',
    })
    const usuario = renderizar()

    await usuario.click(await screen.findByRole('button', { name: 'Avançar para Em execução' }))
    const dialogo = screen.getByRole('dialog', { name: 'Alterar estado para Em execução?' })
    expect(alterarEstadoEstudo).not.toHaveBeenCalled()

    await usuario.click(within(dialogo).getByRole('button', { name: 'Confirmar mudança' }))

    expect(alterarEstadoEstudo).toHaveBeenCalledWith(1, 'EXECUCAO')
    expect(await screen.findByText('Fase atual: Em execução')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'Estado do estudo alterado para Em execução.',
    )
  })

  it('informa que o estado encerrado é terminal', async () => {
    vi.mocked(buscarEstudo).mockResolvedValueOnce({ ...ESTUDO_RECRUTAMENTO, estado: 'ENCERRADO' })
    renderizar()

    expect(await screen.findByText('Fase atual: Encerrado')).toBeInTheDocument()
    expect(
      screen.getByText(/O estado Encerrado é terminal e não possui transição de saída/),
    ).toBeInTheDocument()
  })

  it('mostra mensagem de erro quando a transição falha na API', async () => {
    vi.mocked(alterarEstadoEstudo).mockRejectedValueOnce(
      new ErroEstudoApi(
        'Transição de estado inválida: RECRUTAMENTO -> EXECUCAO',
        409,
        'TRANSICAO_ESTADO_INVALIDA',
        {},
      ),
    )
    const usuario = renderizar()

    await usuario.click(await screen.findByRole('button', { name: 'Avançar para Em execução' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar mudança' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível alterar o estado do estudo. Transição de estado inválida: RECRUTAMENTO -> EXECUCAO',
    )
  })
})
