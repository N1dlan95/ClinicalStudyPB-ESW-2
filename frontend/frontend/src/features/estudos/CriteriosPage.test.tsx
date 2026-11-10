import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import type { Perfil, Sessao } from '../auth/tipos'
import { CriteriosPage } from './CriteriosPage'
import {
  ErroEstudoApi,
  atualizarCriterio,
  buscarEstudo,
  criarCriterio,
  listarCriterios,
  removerCriterio,
} from './estudosService'
import type { Criterio, Estudo } from './tipos'

vi.mock('./estudosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./estudosService')>()
  return {
    ...original,
    buscarEstudo: vi.fn(),
    listarCriterios: vi.fn(),
    criarCriterio: vi.fn(),
    atualizarCriterio: vi.fn(),
    removerCriterio: vi.fn(),
  }
})

const ESTUDO_PLANEJAMENTO: Estudo = {
  id: 1,
  titulo: 'Estudo da vacina A',
  objetivo: 'Avaliar a resposta imune',
  responsavel: { id: 2, nome: 'Ana Pesquisadora' },
  dataInicio: '2026-11-10',
  dataFim: null,
  limiteParticipantes: 30,
  estado: 'PLANEJAMENTO',
}

const CRITERIOS_INICIAIS: Criterio[] = [
  { id: 10, tipo: 'INCLUSAO', descricao: 'Idade entre 18 e 65 anos', ordem: 1 },
  { id: 20, tipo: 'EXCLUSAO', descricao: 'Gestantes ou lactantes', ordem: 1 },
]

function renderizar(perfil: Perfil = 'PESQUISADOR') {
  const sessao: Sessao = {
    token: 'token-de-teste',
    usuario: { id: 2, nome: 'Ana Pesquisadora', email: 'ana@clinicalstudypb.test', perfil },
  }
  localStorage.setItem('clinicalstudypb.sessao', JSON.stringify(sessao))
  const usuario = userEvent.setup()
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/estudos/1/criterios']}>
        <Routes>
          <Route path="/estudos/:id/criterios" element={<CriteriosPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )
  return usuario
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO_PLANEJAMENTO)
  vi.mocked(listarCriterios).mockResolvedValue(CRITERIOS_INICIAIS)
})

describe('CriteriosPage', () => {
  it('lista os critérios separados entre inclusão e exclusão', async () => {
    renderizar()

    expect(await screen.findByText('Idade entre 18 e 65 anos')).toBeInTheDocument()
    expect(screen.getByText('Gestantes ou lactantes')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Critérios de elegibilidade' })).toBeInTheDocument()
  })

  it('valida descrição vazia ou curta antes de chamar a API', async () => {
    const usuario = renderizar()

    await screen.findByText('Idade entre 18 e 65 anos')
    await usuario.click(screen.getByRole('button', { name: '+ Adicionar critério' }))
    expect(screen.getByText('Informe a descrição do critério.')).toBeInTheDocument()

    await usuario.type(
      screen.getByPlaceholderText('Ex.: Idade entre 18 e 65 anos na data da inclusão'),
      'ab',
    )
    await usuario.click(screen.getByRole('button', { name: '+ Adicionar critério' }))
    expect(screen.getByText('A descrição deve ter pelo menos 3 caracteres.')).toBeInTheDocument()
    expect(criarCriterio).not.toHaveBeenCalled()
  })

  it('cadastra um novo critério e atualiza a listagem', async () => {
    vi.mocked(criarCriterio).mockResolvedValueOnce({
      id: 30,
      tipo: 'INCLUSAO',
      descricao: 'Diagnóstico confirmado há 6 meses',
      ordem: 2,
    })
    vi.mocked(listarCriterios)
      .mockResolvedValueOnce(CRITERIOS_INICIAIS)
      .mockResolvedValueOnce([
        ...CRITERIOS_INICIAIS,
        { id: 30, tipo: 'INCLUSAO', descricao: 'Diagnóstico confirmado há 6 meses', ordem: 2 },
      ])

    const usuario = renderizar()
    await screen.findByText('Idade entre 18 e 65 anos')

    await usuario.type(
      screen.getByPlaceholderText('Ex.: Idade entre 18 e 65 anos na data da inclusão'),
      'Diagnóstico confirmado há 6 meses',
    )
    await usuario.click(screen.getByRole('button', { name: '+ Adicionar critério' }))

    expect(criarCriterio).toHaveBeenCalledWith(1, {
      tipo: 'INCLUSAO',
      descricao: 'Diagnóstico confirmado há 6 meses',
      ordem: null,
    })
    expect(await screen.findByText('Diagnóstico confirmado há 6 meses')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Critério cadastrado com sucesso.')
  })

  it('permite editar e remover um critério', async () => {
    vi.mocked(atualizarCriterio).mockResolvedValueOnce({
      id: 10,
      tipo: 'INCLUSAO',
      descricao: 'Idade entre 21 e 60 anos',
      ordem: 1,
    })
    vi.mocked(removerCriterio).mockResolvedValueOnce()

    const usuario = renderizar()
    await screen.findByText('Idade entre 18 e 65 anos')

    await usuario.click(screen.getAllByRole('button', { name: 'Editar' })[0])
    const campoDescricao = screen.getByPlaceholderText(
      'Ex.: Idade entre 18 e 65 anos na data da inclusão',
    )
    expect(campoDescricao).toHaveValue('Idade entre 18 e 65 anos')

    await usuario.clear(campoDescricao)
    await usuario.type(campoDescricao, 'Idade entre 21 e 60 anos')
    await usuario.click(screen.getByRole('button', { name: 'Salvar critério' }))

    expect(atualizarCriterio).toHaveBeenCalledWith(1, 10, {
      tipo: 'INCLUSAO',
      descricao: 'Idade entre 21 e 60 anos',
      ordem: 1,
    })

    await usuario.click(screen.getAllByRole('button', { name: 'Remover' })[0])
    expect(removerCriterio).toHaveBeenCalledWith(1, 10)
  })

  it('bloqueia alterações quando o estudo não está em planejamento', async () => {
    vi.mocked(buscarEstudo).mockResolvedValueOnce({ ...ESTUDO_PLANEJAMENTO, estado: 'RECRUTAMENTO' })
    renderizar()

    expect(await screen.findByText(/Estudo fora de planejamento/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ Adicionar critério' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument()
  })

  it('exibe erro quando a API recusa a remoção de critério em uso', async () => {
    vi.mocked(removerCriterio).mockRejectedValueOnce(
      new ErroEstudoApi(
        'O critério já foi usado em avaliações de candidatos e não pode ser removido',
        409,
        'CRITERIO_EM_USO',
        {},
      ),
    )
    const usuario = renderizar()
    await screen.findByText('Idade entre 18 e 65 anos')

    await usuario.click(screen.getAllByRole('button', { name: 'Remover' })[0])
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível remover o critério. O critério já foi usado em avaliações de candidatos e não pode ser removido',
    )
  })
})
