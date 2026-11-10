import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { Perfil, Sessao } from '../auth/tipos'
import { EstudoFormPage } from './EstudoFormPage'
import {
  ErroEstudoApi,
  atualizarEstudo,
  buscarEstudo,
  criarEstudo,
  listarPesquisadores,
} from './estudosService'
import type { Estudo } from './tipos'

// Task 3236: a tela é testada sem backend; as chamadas à API são simuladas
vi.mock('./estudosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./estudosService')>()
  return {
    ...original,
    buscarEstudo: vi.fn(),
    criarEstudo: vi.fn(),
    atualizarEstudo: vi.fn(),
    listarPesquisadores: vi.fn(),
  }
})

const PESQUISADORA = { id: 2, nome: 'Ana Pesquisadora' }

const ESTUDO: Estudo = {
  id: 7,
  titulo: 'Estudo da vacina A',
  objetivo: 'Avaliar a resposta imune',
  responsavel: PESQUISADORA,
  dataInicio: '2026-11-10',
  dataFim: null,
  limiteParticipantes: 30,
  estado: 'PLANEJAMENTO',
}

function renderizar(endereco: string, perfil: Perfil = 'PESQUISADOR') {
  const sessao: Sessao = {
    token: 'token-de-teste',
    usuario: { ...PESQUISADORA, email: 'pesquisador@clinicalstudypb.test', perfil },
  }
  localStorage.setItem('clinicalstudypb.sessao', JSON.stringify(sessao))
  const usuario = userEvent.setup()
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[endereco]}>
        <Routes>
          <Route path="/estudos" element={<h1>Lista de estudos</h1>} />
          <Route path="/estudos/novo" element={<EstudoFormPage />} />
          <Route path="/estudos/:id/editar" element={<EstudoFormPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  return usuario
}

const campoTitulo = () => screen.getByPlaceholderText('Ex.: Estudo de exemplo C')
const campoObjetivo = () => screen.getByPlaceholderText('Objetivo do estudo e informações para a equipe')
const campoResponsavel = () => screen.getByRole('combobox')
const campoInicio = () => screen.getAllByPlaceholderText('dd/mm/aaaa')[0]
const campoFim = () => screen.getAllByPlaceholderText('dd/mm/aaaa')[1]
const campoLimite = () => screen.getByPlaceholderText('Ex.: 30')
const voltouParaALista = () => screen.findByRole('heading', { name: 'Lista de estudos' })

async function preencher(
  usuario: ReturnType<typeof userEvent.setup>,
  { titulo = 'Estudo novo', objetivo = 'Objetivo do estudo', inicio = '10112026', fim = '', limite = '30' } = {},
) {
  await usuario.type(campoTitulo(), titulo)
  await usuario.type(campoObjetivo(), objetivo)
  await usuario.type(campoInicio(), inicio)
  if (fim) await usuario.type(campoFim(), fim)
  await usuario.type(campoLimite(), limite)
}

beforeEach(() => {
  // Para o pesquisador a rota /usuarios responde 403, e o serviço devolve null
  vi.mocked(listarPesquisadores).mockResolvedValue(null)
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO)
  vi.mocked(criarEstudo).mockImplementation(async (dados) => ({
    ...ESTUDO,
    ...dados,
    id: 100,
    responsavel: PESQUISADORA,
  }))
  vi.mocked(atualizarEstudo).mockImplementation(async (id, dados) => ({
    ...ESTUDO,
    ...dados,
    id,
    responsavel: PESQUISADORA,
  }))
})

describe('EstudoFormPage – cadastro', () => {
  it('avisa que o estudo nasce em planejamento e já seleciona o pesquisador logado', async () => {
    renderizar('/estudos/novo')

    expect(await screen.findByRole('heading', { name: 'Novo estudo' })).toBeInTheDocument()
    expect(
      screen.getByText('O estudo é criado no estado Planejamento. A mudança de estado é feita depois do cadastro.'),
    ).toBeInTheDocument()
    expect(campoResponsavel()).toHaveValue('2')
  })

  it('lista os pesquisadores quando o perfil pode consultá-los, sem pré-selecionar', async () => {
    vi.mocked(listarPesquisadores).mockResolvedValueOnce([PESQUISADORA, { id: 5, nome: 'Bruno Pesquisador' }])
    renderizar('/estudos/novo', 'ADMINISTRADOR')

    await screen.findByRole('heading', { name: 'Novo estudo' })
    expect(screen.getByRole('option', { name: 'Bruno Pesquisador' })).toBeInTheDocument()
    expect(campoResponsavel()).toHaveValue('')
  })

  it('mostra o erro de cada campo e o aviso com a lista ao enviar vazio', async () => {
    const usuario = renderizar('/estudos/novo')

    await usuario.click(await screen.findByRole('button', { name: 'Cadastrar estudo' }))

    expect(screen.getByText('Corrija 4 campos para cadastrar o estudo:')).toBeInTheDocument()
    expect(screen.getByText('Informe o título do estudo.')).toBeInTheDocument()
    expect(screen.getByText('Informe o objetivo do estudo.')).toBeInTheDocument()
    expect(screen.getByText('Informe a data de início.')).toBeInTheDocument()
    expect(screen.getByText('Informe o limite de participantes.')).toBeInTheDocument()
    expect(criarEstudo).not.toHaveBeenCalled()
  })

  it('não aceita data de término anterior à de início', async () => {
    const usuario = renderizar('/estudos/novo')

    await screen.findByRole('heading', { name: 'Novo estudo' })
    await preencher(usuario, { inicio: '10112026', fim: '09112026' })
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar estudo' }))

    expect(screen.getByText('A data de término não pode ser anterior à data de início.')).toBeInTheDocument()
    expect(screen.getByText('Corrija o campo destacado para cadastrar o estudo.')).toBeInTheDocument()
    expect(criarEstudo).not.toHaveBeenCalled()
  })

  it('não aceita data que não existe no calendário', async () => {
    const usuario = renderizar('/estudos/novo')

    await screen.findByRole('heading', { name: 'Novo estudo' })
    await preencher(usuario, { inicio: '31022027' })
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar estudo' }))

    expect(screen.getByText('Data inválida. Use o formato dd/mm/aaaa.')).toBeInTheDocument()
    expect(criarEstudo).not.toHaveBeenCalled()
  })

  it('não aceita limite de participantes zero', async () => {
    const usuario = renderizar('/estudos/novo')

    await screen.findByRole('heading', { name: 'Novo estudo' })
    await preencher(usuario, { limite: '0' })
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar estudo' }))

    expect(screen.getByText('Informe um número inteiro maior que zero.')).toBeInTheDocument()
    expect(criarEstudo).not.toHaveBeenCalled()
  })

  it('aceita só números no limite e põe as barras na data enquanto digita', async () => {
    const usuario = renderizar('/estudos/novo')

    await screen.findByRole('heading', { name: 'Novo estudo' })
    await usuario.type(campoLimite(), '3a0')
    await usuario.type(campoInicio(), '10112026')

    expect(campoLimite()).toHaveValue('30')
    expect(campoInicio()).toHaveValue('10/11/2026')
  })

  it('envia os dados no formato da API e volta para a listagem', async () => {
    const usuario = renderizar('/estudos/novo')

    await screen.findByRole('heading', { name: 'Novo estudo' })
    await preencher(usuario, { titulo: '  Estudo novo  ', fim: '10052027' })
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar estudo' }))

    expect(await voltouParaALista()).toBeInTheDocument()
    expect(criarEstudo).toHaveBeenCalledWith({
      titulo: 'Estudo novo',
      objetivo: 'Objetivo do estudo',
      responsavelId: 2,
      dataInicio: '2026-11-10',
      dataFim: '2027-05-10',
      limiteParticipantes: 30,
    })
  })

  it('envia a data de término vazia como null', async () => {
    const usuario = renderizar('/estudos/novo')

    await screen.findByRole('heading', { name: 'Novo estudo' })
    await preencher(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar estudo' }))

    expect(await voltouParaALista()).toBeInTheDocument()
    expect(criarEstudo).toHaveBeenCalledWith(expect.objectContaining({ dataFim: null }))
  })

  it('mostra no campo o erro de validação que veio do backend', async () => {
    vi.mocked(criarEstudo).mockRejectedValueOnce(
      new ErroEstudoApi('Revise os dados informados.', 400, 'VALIDACAO', {
        responsavelId: 'O responsável deve ser um pesquisador ativo',
      }),
    )
    const usuario = renderizar('/estudos/novo')

    await screen.findByRole('heading', { name: 'Novo estudo' })
    await preencher(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar estudo' }))

    expect(await screen.findByText('O responsável deve ser um pesquisador ativo')).toBeInTheDocument()
    expect(screen.getByText('Corrija o campo destacado para cadastrar o estudo.')).toBeInTheDocument()
  })

  it('mostra uma mensagem geral quando o cadastro falha por outro motivo', async () => {
    vi.mocked(criarEstudo).mockRejectedValueOnce(
      new ErroEstudoApi('Seu perfil não tem permissão para esta ação.', 403, 'SEM_PERMISSAO', {}),
    )
    const usuario = renderizar('/estudos/novo')

    await screen.findByRole('heading', { name: 'Novo estudo' })
    await preencher(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Cadastrar estudo' }))

    expect(
      await screen.findByText('Não foi possível cadastrar o estudo. Seu perfil não tem permissão para esta ação.'),
    ).toBeInTheDocument()
  })
})

describe('EstudoFormPage – edição', () => {
  it('carrega os dados do estudo nos campos', async () => {
    renderizar('/estudos/7/editar')

    expect(await screen.findByRole('heading', { name: 'Editar estudo' })).toBeInTheDocument()
    expect(buscarEstudo).toHaveBeenCalledWith(7)
    expect(campoTitulo()).toHaveValue('Estudo da vacina A')
    expect(campoObjetivo()).toHaveValue('Avaliar a resposta imune')
    expect(campoResponsavel()).toHaveValue('2')
    expect(campoInicio()).toHaveValue('10/11/2026')
    expect(campoFim()).toHaveValue('')
    expect(campoLimite()).toHaveValue('30')
    expect(screen.getByText('Planejamento', { selector: 'span' })).toBeInTheDocument()
  })

  it('salva as alterações e volta para a listagem', async () => {
    const usuario = renderizar('/estudos/7/editar')

    await screen.findByRole('heading', { name: 'Editar estudo' })
    await usuario.clear(campoLimite())
    await usuario.type(campoLimite(), '40')
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(await voltouParaALista()).toBeInTheDocument()
    expect(atualizarEstudo).toHaveBeenCalledWith(7, {
      titulo: 'Estudo da vacina A',
      objetivo: 'Avaliar a resposta imune',
      responsavelId: 2,
      dataInicio: '2026-11-10',
      dataFim: null,
      limiteParticipantes: 40,
    })
  })

  it('bloqueia a edição de estudo encerrado', async () => {
    vi.mocked(buscarEstudo).mockResolvedValueOnce({ ...ESTUDO, estado: 'ENCERRADO' })
    renderizar('/estudos/7/editar')

    expect(await screen.findByText('Estudo encerrado não pode ser editado.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
    expect(campoTitulo()).toBeDisabled()
  })

  it('mostra erro quando o estudo não é encontrado', async () => {
    vi.mocked(buscarEstudo).mockRejectedValueOnce(new ErroEstudoApi('Estudo não encontrado.', 404, 'NAO_ENCONTRADO', {}))
    renderizar('/estudos/999/editar')

    expect(
      await screen.findByText('Não foi possível carregar os dados. Estudo não encontrado.'),
    ).toBeInTheDocument()
  })

  it('mostra a mensagem geral quando a edição esbarra numa regra do backend', async () => {
    vi.mocked(atualizarEstudo).mockRejectedValueOnce(
      new ErroEstudoApi('Estudo encerrado não pode ser editado', 409, 'ESTUDO_ENCERRADO', {}),
    )
    const usuario = renderizar('/estudos/7/editar')

    await screen.findByRole('heading', { name: 'Editar estudo' })
    await usuario.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    expect(
      await screen.findByText('Não foi possível salvar as alterações. Estudo encerrado não pode ser editado'),
    ).toBeInTheDocument()
  })
})
