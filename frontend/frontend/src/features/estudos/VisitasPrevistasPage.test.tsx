import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { Sessao } from '../auth/tipos'
import { VisitasPrevistasPage } from './VisitasPrevistasPage'
import {
  buscarEstudo,
  criarVisitaPrevista,
  excluirVisitaPrevista,
  listarVisitasPrevistas,
} from './estudosService'
import type { Estudo, VisitaPrevista } from './tipos'

vi.mock('./estudosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./estudosService')>()
  return {
    ...original,
    buscarEstudo: vi.fn(),
    listarVisitasPrevistas: vi.fn(),
    criarVisitaPrevista: vi.fn(),
    atualizarVisitaPrevista: vi.fn(),
    excluirVisitaPrevista: vi.fn(),
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
  estado: 'PLANEJAMENTO',
}

const VISITAS: VisitaPrevista[] = [
  {
    id: 100,
    ordem: 1,
    nome: 'Visita de triagem',
    diaPrevisto: 0,
    janelaDias: 2,
    descricao: 'Primeira avaliação presencial',
    atividades: [
      { id: 1, ordem: 1, descricao: 'Coleta de sangue' },
      { id: 2, ordem: 2, descricao: 'Aferição de pressão arterial' },
    ],
  },
]

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
      <MemoryRouter initialEntries={['/estudos/1/visitas-previstas']}>
        <Routes>
          <Route path="/estudos/:id/visitas-previstas" element={<VisitasPrevistasPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  return usuario
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO)
  vi.mocked(listarVisitasPrevistas).mockResolvedValue(VISITAS)
})

describe('VisitasPrevistasPage', () => {
  it('exibe as visitas previstas e suas atividades', async () => {
    renderizar()

    expect(await screen.findByText('Visita #1 · Visita de triagem')).toBeInTheDocument()
    expect(screen.getByText('Dia D0')).toBeInTheDocument()
    expect(screen.getByText('Janela ± 2 dias')).toBeInTheDocument()
    expect(screen.getByText('Coleta de sangue')).toBeInTheDocument()
    expect(screen.getByText('Aferição de pressão arterial')).toBeInTheDocument()
  })

  it('valida nome da visita e descrição das atividades antes de enviar', async () => {
    const usuario = renderizar()
    await screen.findByText('Visita #1 · Visita de triagem')

    await usuario.click(screen.getByRole('button', { name: '+ Cadastrar visita' }))
    expect(screen.getByText('Informe o nome da visita.')).toBeInTheDocument()
    expect(
      screen.getByText('A descrição de todas as atividades é obrigatória.'),
    ).toBeInTheDocument()
    expect(criarVisitaPrevista).not.toHaveBeenCalled()
  })

  it('cadastra uma visita prevista com atividades e atualiza a lista', async () => {
    const novaVisita: VisitaPrevista = {
      id: 200,
      ordem: 2,
      nome: 'Visita de retorno D30',
      diaPrevisto: 30,
      janelaDias: 3,
      descricao: null,
      atividades: [{ id: 3, ordem: 1, descricao: 'Avaliação clínica de acompanhamento' }],
    }
    vi.mocked(criarVisitaPrevista).mockResolvedValueOnce(novaVisita)
    vi.mocked(listarVisitasPrevistas)
      .mockResolvedValueOnce(VISITAS)
      .mockResolvedValueOnce([...VISITAS, novaVisita])

    const usuario = renderizar()
    await screen.findByText('Visita #1 · Visita de triagem')

    await usuario.type(
      screen.getByPlaceholderText('Ex.: Visita de triagem'),
      'Visita de retorno D30',
    )
    const campoDia = screen.getByPlaceholderText('Ex.: 0')
    await usuario.clear(campoDia)
    await usuario.type(campoDia, '30')
    await usuario.type(screen.getByPlaceholderText('Opcional. Ex.: 2'), '3')
    await usuario.type(
      screen.getByLabelText('Descrição da atividade 1'),
      'Avaliação clínica de acompanhamento',
    )

    await usuario.click(screen.getByRole('button', { name: '+ Cadastrar visita' }))

    expect(criarVisitaPrevista).toHaveBeenCalledWith(1, {
      ordem: 2,
      nome: 'Visita de retorno D30',
      diaPrevisto: 30,
      janelaDias: 3,
      descricao: null,
      atividades: [{ ordem: 1, descricao: 'Avaliação clínica de acompanhamento' }],
    })
    expect(await screen.findByText('Visita #2 · Visita de retorno D30')).toBeInTheDocument()
  })

  it('permite excluir uma visita prevista', async () => {
    vi.mocked(excluirVisitaPrevista).mockResolvedValueOnce()
    const usuario = renderizar()
    await screen.findByText('Visita #1 · Visita de triagem')

    await usuario.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(excluirVisitaPrevista).toHaveBeenCalledWith(1, 100)
    expect(await screen.findByText('Visita prevista excluída com sucesso.')).toBeInTheDocument()
  })

  it('bloqueia alterações quando o estudo está encerrado', async () => {
    vi.mocked(buscarEstudo).mockResolvedValueOnce({ ...ESTUDO, estado: 'ENCERRADO' })
    renderizar()

    expect(
      await screen.findByText(/Não é possível alterar visitas previstas de um estudo encerrado/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Cadastrar visita' })).toBeDisabled()
  })
})
