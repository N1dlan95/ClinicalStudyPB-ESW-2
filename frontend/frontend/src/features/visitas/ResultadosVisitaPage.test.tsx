import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import { ExigePermissao } from '../auth/RotaProtegida'
import type { Perfil } from '../auth/tipos'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import { dataHoraBR } from './datas'
import { ResultadosVisitaPage } from './ResultadosVisitaPage'
import type { ResultadosVisita, Visita } from './tipos'
import { ErroVisitaApi, buscarVisita, listarResultados, registrarResultados } from './visitasService'

vi.mock('../estudos/estudosService', () => ({ buscarEstudo: vi.fn() }))
vi.mock('./visitasService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./visitasService')>()
  return {
    ...original,
    buscarVisita: vi.fn(),
    listarResultados: vi.fn(),
    registrarResultados: vi.fn(),
  }
})

const ESTUDO: Estudo = {
  id: 7,
  titulo: 'Estudo de Controle Glicêmico',
  objetivo: 'Avaliar o controle glicêmico',
  responsavel: { id: 2, nome: 'Ana Pesquisadora' },
  dataInicio: '2026-11-01',
  dataFim: null,
  limiteParticipantes: 30,
  estado: 'EXECUCAO',
}

const VISITA: Visita = {
  id: 70,
  estudoId: 7,
  participante: { candidatoId: 5, nome: 'João Silva' },
  visitaPrevista: { id: 20, ordem: 1, nome: 'Triagem' },
  dataHora: '2026-11-20T09:00:00',
  local: 'Sala 2',
  status: 'REALIZADA',
  observacao: null,
}

// Pressão já registrada; glicemia ainda sem resultado. Vêm fora da ordem do protocolo.
const RESULTADOS: ResultadosVisita = {
  visitaId: 70,
  status: 'REALIZADA',
  itens: [
    {
      atividadeId: 41,
      ordem: 2,
      descricao: 'Coletar glicemia',
      resultado: null,
      observacao: null,
      registradoEm: null,
      registradoPor: null,
    },
    {
      atividadeId: 40,
      ordem: 1,
      descricao: 'Aferir pressão arterial',
      resultado: 'PA 130x90',
      observacao: 'Sentado',
      registradoEm: '2026-11-20T10:15:00',
      registradoPor: 'Carla Coordenadora',
    },
  ],
}

function renderizar(perfil: Perfil = 'COORDENADOR') {
  const usuario = userEvent.setup()
  render(
    <AuthContext.Provider
      value={{
        usuario: { id: 1, nome: 'Usuário', email: 'u@clinicalstudypb.test', perfil },
        token: 't',
        autenticado: true,
        entrar: () => {},
        sair: () => {},
      }}
    >
      <MemoryRouter initialEntries={['/estudos/7/visitas/70/resultados']}>
        <Routes>
          <Route
            path="/estudos/:estudoId/visitas/:visitaId/resultados"
            element={
              <ExigePermissao permissao="verResultados">
                <ResultadosVisitaPage />
              </ExigePermissao>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return usuario
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO)
  vi.mocked(buscarVisita).mockResolvedValue(VISITA)
  vi.mocked(listarResultados).mockResolvedValue(RESULTADOS)
})

describe('ResultadosVisitaPage', () => {
  it('monta o formulário com uma linha por atividade, na ordem, já com o que foi registrado', async () => {
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Resultados · Triagem' })).toBeInTheDocument()
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('20/11/2026 09:00')).toBeInTheDocument()
    expect(screen.getByText('Realizada')).toBeInTheDocument()

    const descricoes = screen.getAllByText(/^#\d · /).map((elemento) => elemento.textContent)
    expect(descricoes).toEqual(['#1 · Aferir pressão arterial', '#2 · Coletar glicemia'])
    expect(screen.getByLabelText('Resultado de Aferir pressão arterial')).toHaveValue('PA 130x90')
    expect(screen.getByLabelText('Observação de Aferir pressão arterial')).toHaveValue('Sentado')
    expect(screen.getByLabelText('Resultado de Coletar glicemia')).toHaveValue('')
    expect(screen.getByText('Último registro em 20/11/2026 10:15 por Carla Coordenadora')).toBeInTheDocument()
    expect(listarResultados).toHaveBeenCalledWith(70)
  })

  it('exige o resultado de todas as atividades antes de salvar', async () => {
    const usuario = renderizar()
    await screen.findByRole('heading', { name: 'Resultados · Triagem' })

    await usuario.click(screen.getByRole('button', { name: 'Salvar resultados' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Informe o resultado de todas as atividades. Falta 1 atividade.')
    const campo = screen.getByLabelText('Resultado de Coletar glicemia')
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    expect(campo).toHaveAccessibleDescription('Informe o resultado.')
    expect(registrarResultados).not.toHaveBeenCalled()

    // Ao preencher, o erro do campo some
    await usuario.type(campo, '92 mg/dL')
    expect(campo).not.toHaveAttribute('aria-invalid')
  })

  it('resultado só com espaços conta como vazio', async () => {
    const usuario = renderizar()
    await screen.findByRole('heading', { name: 'Resultados · Triagem' })

    await usuario.clear(screen.getByLabelText('Resultado de Aferir pressão arterial'))
    await usuario.type(screen.getByLabelText('Resultado de Aferir pressão arterial'), '   ')
    await usuario.click(screen.getByRole('button', { name: 'Salvar resultados' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Faltam 2 atividades.')
    expect(registrarResultados).not.toHaveBeenCalled()
  })

  it('salva tudo de uma vez e mostra a mensagem de sucesso', async () => {
    vi.mocked(registrarResultados).mockResolvedValue({
      ...RESULTADOS,
      itens: [
        { ...RESULTADOS.itens[1], resultado: 'PA 120x80', observacao: null },
        {
          ...RESULTADOS.itens[0],
          resultado: '92 mg/dL',
          observacao: 'Em jejum',
          registradoEm: '2026-11-21T08:00:00',
          registradoPor: 'Usuário',
        },
      ],
    })
    const usuario = renderizar()
    await screen.findByRole('heading', { name: 'Resultados · Triagem' })

    const pressao = screen.getByLabelText('Resultado de Aferir pressão arterial')
    await usuario.clear(pressao)
    await usuario.type(pressao, ' PA 120x80 ')
    await usuario.clear(screen.getByLabelText('Observação de Aferir pressão arterial'))
    await usuario.type(screen.getByLabelText('Resultado de Coletar glicemia'), '92 mg/dL')
    await usuario.type(screen.getByLabelText('Observação de Coletar glicemia'), 'Em jejum')
    await usuario.click(screen.getByRole('button', { name: 'Salvar resultados' }))

    expect(await screen.findByText('Resultados salvos com sucesso.')).toBeInTheDocument()
    expect(registrarResultados).toHaveBeenCalledWith(70, {
      itens: [
        { atividadeId: 40, resultado: 'PA 120x80', observacao: null },
        { atividadeId: 41, resultado: '92 mg/dL', observacao: 'Em jejum' },
      ],
    })
    expect(screen.getByText('Último registro em 21/11/2026 08:00 por Usuário')).toBeInTheDocument()
  })

  it('mostra o erro da API pelo código', async () => {
    vi.mocked(registrarResultados).mockRejectedValue(
      new ErroVisitaApi('O estudo está encerrado: os resultados não podem mais ser alterados.', 409, 'ESTUDO_ENCERRADO'),
    )
    const usuario = renderizar()
    await screen.findByRole('heading', { name: 'Resultados · Triagem' })

    await usuario.type(screen.getByLabelText('Resultado de Coletar glicemia'), '92 mg/dL')
    await usuario.click(screen.getByRole('button', { name: 'Salvar resultados' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível salvar os resultados. O estudo está encerrado: os resultados não podem mais ser alterados.',
    )
    expect(screen.getByRole('button', { name: 'Salvar resultados' })).toBeEnabled()
  })

  it.each<Perfil>(['PESQUISADOR', 'ADMINISTRADOR'])('%s vê os resultados em modo leitura', async (perfil) => {
    renderizar(perfil)

    expect(await screen.findByRole('heading', { name: 'Resultados da visita' })).toBeInTheDocument()
    expect(screen.getByText('Modo leitura.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar resultados' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

    const linhas = screen.getAllByRole('row')
    expect(within(linhas[1]).getByText('#1 · Aferir pressão arterial')).toBeInTheDocument()
    expect(within(linhas[1]).getByText('PA 130x90')).toBeInTheDocument()
    expect(within(linhas[1]).getByText('por Carla Coordenadora')).toBeInTheDocument()
    expect(within(linhas[2]).getByText('Não registrado')).toBeInTheDocument()
    // GET /visitas/{id} é só do coordenador: os outros perfis não chamam
    expect(buscarVisita).not.toHaveBeenCalled()
  })

  it.each(['AGENDADA', 'AUSENTE', 'CANCELADA'] as const)(
    'visita %s não mostra o formulário',
    async (status) => {
      vi.mocked(listarResultados).mockResolvedValue({ ...RESULTADOS, status })
      renderizar()

      expect(await screen.findByText(/Os resultados só podem ser registrados depois/)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Salvar resultados' })).not.toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    },
  )

  it('com o estudo encerrado, o coordenador só consulta', async () => {
    vi.mocked(buscarEstudo).mockResolvedValue({ ...ESTUDO, estado: 'ENCERRADO' })
    renderizar()

    expect(await screen.findByText('Estudo encerrado.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar resultados' })).not.toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('visita prevista sem atividades mostra o estado vazio', async () => {
    vi.mocked(listarResultados).mockResolvedValue({ ...RESULTADOS, itens: [] })
    renderizar()

    expect(await screen.findByText('A visita prevista não tem atividades cadastradas.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar resultados' })).not.toBeInTheDocument()
  })

  it('mostra o erro quando não consegue carregar', async () => {
    vi.mocked(listarResultados).mockRejectedValue(new ErroVisitaApi('Visita não encontrada.', 404, 'NAO_ENCONTRADO'))
    renderizar()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar os resultados. Visita não encontrada.',
    )
  })

  it('sem os dados da visita, o cabeçalho fica com o estudo e o status', async () => {
    vi.mocked(buscarVisita).mockRejectedValue(new Error('falhou'))
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Resultados da visita' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar resultados' })).toBeInTheDocument()
  })

  it('participante não acessa a tela', () => {
    renderizar('PARTICIPANTE')

    expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument()
    expect(listarResultados).not.toHaveBeenCalled()
  })
})

describe('dataHoraBR', () => {
  it('formata data e hora da API', () => {
    expect(dataHoraBR('2026-12-01T10:15:00')).toBe('01/12/2026 10:15')
    expect(dataHoraBR('2026-12-01')).toBe('01/12/2026')
    expect(dataHoraBR(null)).toBe('')
    expect(dataHoraBR('inválida')).toBe('inválida')
  })
})
