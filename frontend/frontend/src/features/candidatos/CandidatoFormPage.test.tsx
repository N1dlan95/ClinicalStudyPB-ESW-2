import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import { CandidatoFormPage } from './CandidatoFormPage'
import { ErroCandidatoApi, atualizarCandidato, buscarCandidato, criarCandidato } from './candidatosService'

vi.mock('../estudos/estudosService', () => ({ buscarEstudo: vi.fn() }))
vi.mock('./candidatosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./candidatosService')>()
  return { ...original, buscarCandidato: vi.fn(), criarCandidato: vi.fn(), atualizarCandidato: vi.fn() }
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

function renderizar(rota = '/estudos/7/candidatos/novo') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route path="/estudos/:estudoId/candidatos/novo" element={<CandidatoFormPage />} />
        <Route path="/estudos/:estudoId/candidatos/:id/editar" element={<CandidatoFormPage />} />
        <Route path="/estudos/:estudoId/candidatos" element={<p>Lista de candidatos</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function preencher() {
  await userEvent.type(await screen.findByLabelText(/Nome completo/), 'Maria Souza')
  await userEvent.type(screen.getByLabelText(/Data de nascimento/), '14031988')
  await userEvent.type(screen.getByLabelText(/E-mail/), 'maria.souza@exemplo.test')
  await userEvent.type(screen.getByLabelText(/Telefone/), '83999990000')
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO)
})

describe('CandidatoFormPage – cadastro', () => {
  it('mostra os erros dos campos obrigatórios sem chamar a API', async () => {
    renderizar()
    await userEvent.click(await screen.findByRole('button', { name: 'Cadastrar candidato' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Corrija 3 campos para cadastrar o candidato')
    expect(screen.getByText('Informe o nome completo.')).toBeInTheDocument()
    expect(screen.getByLabelText(/Nome completo/)).toHaveAttribute('aria-invalid', 'true')
    expect(criarCandidato).not.toHaveBeenCalled()
  })

  it('envia os dados formatados para a API e volta para a lista', async () => {
    vi.mocked(criarCandidato).mockResolvedValue({ id: 1, nome: 'Maria Souza', email: 'maria.souza@exemplo.test', telefone: '(83) 99999-0000', dataNascimento: '1988-03-14', status: 'CADASTRADO' })
    renderizar()
    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar candidato' }))

    expect(criarCandidato).toHaveBeenCalledWith(7, {
      nome: 'Maria Souza',
      email: 'maria.souza@exemplo.test',
      telefone: '(83) 99999-0000',
      dataNascimento: '1988-03-14',
    })
    expect(await screen.findByText('Lista de candidatos')).toBeInTheDocument()
  })

  it('mostra no campo o e-mail repetido devolvido pela API', async () => {
    vi.mocked(criarCandidato).mockRejectedValue(
      new ErroCandidatoApi('E-mail já cadastrado neste estudo', 409, 'EMAIL_DUPLICADO', { email: 'E-mail já cadastrado neste estudo' }),
    )
    renderizar()
    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar candidato' }))

    expect(await screen.findByText('E-mail já cadastrado neste estudo')).toBeInTheDocument()
    expect(screen.getByLabelText(/E-mail/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('mostra a mensagem da API para erros gerais', async () => {
    vi.mocked(criarCandidato).mockRejectedValue(
      new ErroCandidatoApi('O estudo não está em recrutamento', 409, 'ESTUDO_FORA_DE_RECRUTAMENTO', {}),
    )
    renderizar()
    await preencher()
    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar candidato' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível cadastrar o candidato. O estudo não está em recrutamento',
    )
  })

  it('bloqueia o cadastro quando o estudo não está em recrutamento', async () => {
    vi.mocked(buscarEstudo).mockResolvedValue({ ...ESTUDO, estado: 'EXECUCAO' })
    renderizar()

    expect(await screen.findByText(/Estudo fora de recrutamento/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cadastrar candidato' })).toBeDisabled()
  })
})

describe('CandidatoFormPage – edição', () => {
  it('carrega o candidato, mostra o status e salva pelo PUT', async () => {
    vi.mocked(buscarCandidato).mockResolvedValue({ id: 3, nome: 'João Lima', email: 'joao@exemplo.test', telefone: null, dataNascimento: '1990-01-02', status: 'ELEGIVEL' })
    vi.mocked(atualizarCandidato).mockResolvedValue({ id: 3, nome: 'João Lima', email: 'joao@exemplo.test', telefone: null, dataNascimento: '1990-01-02', status: 'ELEGIVEL' })
    renderizar('/estudos/7/candidatos/3/editar')

    expect(await screen.findByDisplayValue('João Lima')).toBeInTheDocument()
    expect(screen.getByDisplayValue('02/01/1990')).toBeInTheDocument()
    expect(screen.getByText('Elegível')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
    expect(atualizarCandidato).toHaveBeenCalledWith(7, 3, {
      nome: 'João Lima',
      email: 'joao@exemplo.test',
      telefone: null,
      dataNascimento: '1990-01-02',
    })
  })
})
