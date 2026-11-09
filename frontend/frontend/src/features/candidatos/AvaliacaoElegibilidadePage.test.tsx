import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import { AvaliacaoElegibilidadePage } from './AvaliacaoElegibilidadePage'
import {
  buscarCandidato,
  consultarAvaliacao,
  registrarAvaliacao,
} from './candidatosService'
import type { Avaliacao, Candidato } from './tipos'

vi.mock('../estudos/estudosService', () => ({ buscarEstudo: vi.fn() }))
vi.mock('./candidatosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./candidatosService')>()
  return {
    ...original,
    buscarCandidato: vi.fn(),
    consultarAvaliacao: vi.fn(),
    registrarAvaliacao: vi.fn(),
  }
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

const CANDIDATO: Candidato = {
  id: 3,
  nome: 'Carlos Alberto Ferreira',
  email: 'carlos@exemplo.test',
  telefone: null,
  dataNascimento: '1984-05-14',
  status: 'CADASTRADO',
  consentimento: null,
}

const AVALIACAO_PENDENTE: Avaliacao = {
  candidatoId: 3,
  status: 'CADASTRADO',
  avaliadoEm: null,
  avaliadoPor: null,
  criterios: [
    {
      criterioId: 10,
      tipo: 'INCLUSAO',
      descricao: 'Idade entre 18 e 65 anos',
      ordem: 1,
      atende: null,
      observacao: null,
    },
    {
      criterioId: 20,
      tipo: 'EXCLUSAO',
      descricao: 'Uso de imunossupressores',
      ordem: 1,
      atende: null,
      observacao: null,
    },
  ],
}

function renderizar() {
  const usuario = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/estudos/7/candidatos/3/avaliacao']}>
      <Routes>
        <Route
          path="/estudos/:estudoId/candidatos/:id/avaliacao"
          element={<AvaliacaoElegibilidadePage />}
        />
      </Routes>
    </MemoryRouter>,
  )
  return usuario
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO)
  vi.mocked(buscarCandidato).mockResolvedValue(CANDIDATO)
  vi.mocked(consultarAvaliacao).mockResolvedValue(AVALIACAO_PENDENTE)
})

describe('AvaliacaoElegibilidadePage', () => {
  it('exibe os dados do candidato e os critérios de inclusão e exclusão', async () => {
    renderizar()

    expect(
      await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Carlos Alberto Ferreira').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('#1 · Idade entre 18 e 65 anos')).toBeInTheDocument()
    expect(screen.getByText('#1 · Uso de imunossupressores')).toBeInTheDocument()
    expect(screen.getByText('Ainda não avaliado')).toBeInTheDocument()
  })

  it('exige que todos os critérios sejam respondidos antes de registrar', async () => {
    const usuario = renderizar()
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' })

    await usuario.click(screen.getByRole('button', { name: 'Registrar avaliação' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Todos os critérios do estudo devem ser avaliados. Falta responder 2 critérios.',
    )
    expect(registrarAvaliacao).not.toHaveBeenCalled()
  })

  it('calcula prévia elegível quando atende inclusão e não apresenta exclusão e registra na API', async () => {
    vi.mocked(registrarAvaliacao).mockResolvedValueOnce({
      ...AVALIACAO_PENDENTE,
      status: 'ELEGIVEL',
      avaliadoEm: '2026-11-08T14:00:00',
      avaliadoPor: { id: 4, nome: 'Carlos Coordenador' },
      criterios: [
        { ...AVALIACAO_PENDENTE.criterios[0], atende: true, observacao: '42 anos confirmados' },
        { ...AVALIACAO_PENDENTE.criterios[1], atende: false, observacao: null },
      ],
    })

    const usuario = renderizar()
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' })

    const grupoInclusao = screen.getByRole('radiogroup', { name: 'Idade entre 18 e 65 anos' })
    const grupoExclusao = screen.getByRole('radiogroup', { name: 'Uso de imunossupressores' })

    await usuario.click(within(grupoInclusao).getByRole('radio', { name: 'Sim' }))
    await usuario.click(within(grupoExclusao).getByRole('radio', { name: 'Não' }))
    await usuario.type(
      screen.getByLabelText('Observação de Idade entre 18 e 65 anos'),
      '42 anos confirmados',
    )

    expect(screen.getByText(/Resultado calculado: Candidato Elegível/)).toBeInTheDocument()

    await usuario.click(screen.getByRole('button', { name: 'Registrar avaliação' }))

    expect(registrarAvaliacao).toHaveBeenCalledWith(3, {
      respostas: [
        { criterioId: 10, atende: true, observacao: '42 anos confirmados' },
        { criterioId: 20, atende: false, observacao: null },
      ],
    })
    expect(
      await screen.findByText('Avaliação registrada com sucesso. Resultado: Elegível.'),
    ).toBeInTheDocument()
  })

  it('calcula prévia inelegível quando um critério de exclusão é marcado como Sim', async () => {
    const usuario = renderizar()
    await screen.findByRole('heading', { name: 'Avaliação de elegibilidade' })

    const grupoInclusao = screen.getByRole('radiogroup', { name: 'Idade entre 18 e 65 anos' })
    const grupoExclusao = screen.getByRole('radiogroup', { name: 'Uso de imunossupressores' })

    await usuario.click(within(grupoInclusao).getByRole('radio', { name: 'Sim' }))
    await usuario.click(within(grupoExclusao).getByRole('radio', { name: 'Sim' }))

    expect(screen.getByText(/Resultado calculado: Candidato Inelegível/)).toBeInTheDocument()
  })

  it('bloqueia a avaliação quando o candidato já tem consentimento registrado', async () => {
    vi.mocked(buscarCandidato).mockResolvedValueOnce({
      ...CANDIDATO,
      status: 'ELEGIVEL',
      consentimento: { registradoEm: '2026-11-05', registradoPor: 'Carlos Coordenador' },
    })
    renderizar()

    expect(
      await screen.findByText(/Candidato com consentimento registrado não pode ser reavaliado/),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar avaliação' })).toBeDisabled()
  })
})
