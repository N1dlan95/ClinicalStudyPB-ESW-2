import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import { CandidatoDetalhePage } from './CandidatoDetalhePage'
import { ErroCandidatoApi, buscarCandidato, contarIncluidos, incluirCandidato, registrarConsentimento } from './candidatosService'
import type { Candidato } from './tipos'

vi.mock('../estudos/estudosService', () => ({ buscarEstudo: vi.fn() }))
vi.mock('./candidatosService', async (importOriginal) => {
  const original = await importOriginal<typeof import('./candidatosService')>()
  return { ...original, buscarCandidato: vi.fn(), registrarConsentimento: vi.fn(), contarIncluidos: vi.fn(), incluirCandidato: vi.fn() }
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

const ELEGIVEL: Candidato = {
  id: 3,
  nome: 'Ana Ribeiro',
  email: 'ana.ribeiro@exemplo.test',
  telefone: null,
  dataNascimento: '1995-05-22',
  status: 'ELEGIVEL',
  consentimento: null,
}

function renderizar() {
  return render(
    <MemoryRouter initialEntries={['/estudos/7/candidatos/3']}>
      <Routes>
        <Route path="/estudos/:estudoId/candidatos/:id" element={<CandidatoDetalhePage />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(buscarEstudo).mockResolvedValue(ESTUDO)
  vi.mocked(buscarCandidato).mockResolvedValue(ELEGIVEL)
  vi.mocked(contarIncluidos).mockResolvedValue(18)
})

describe('CandidatoDetalhePage – consentimento', () => {
  it('mostra os dados e a ação de registrar para candidato elegível sem consentimento', async () => {
    renderizar()

    expect(await screen.findByRole('heading', { name: 'Ana Ribeiro' })).toBeInTheDocument()
    expect(screen.getByText('ana.ribeiro@exemplo.test')).toBeInTheDocument()
    expect(screen.getByText('22/05/1995')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Registrar consentimento' })).toBeInTheDocument()
  })

  it('pede confirmação e só registra depois de confirmar', async () => {
    vi.mocked(registrarConsentimento).mockResolvedValue({
      ...ELEGIVEL,
      consentimento: { registradoEm: '2026-11-04T10:00:00-03:00', registradoPor: 'Carlos Coordenador' },
    })
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar consentimento' }))
    const dialogo = screen.getByRole('dialog', { name: 'Registrar consentimento?' })
    expect(within(dialogo).getByText(/Ana Ribeiro concordou em participar/)).toBeInTheDocument()
    expect(registrarConsentimento).not.toHaveBeenCalled()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar registro' }))

    expect(registrarConsentimento).toHaveBeenCalledWith(7, 3)
    expect(await screen.findByText(/em 04\/11\/2026 por Carlos Coordenador/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Consentimento registrado.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar consentimento' })).not.toBeInTheDocument()
  })

  it('fecha a confirmação ao cancelar, sem registrar', async () => {
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar consentimento' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(registrarConsentimento).not.toHaveBeenCalled()
  })

  it('mostra a mensagem do backend quando o registro é recusado', async () => {
    vi.mocked(registrarConsentimento).mockRejectedValue(
      new ErroCandidatoApi('O consentimento já foi registrado', 409, 'CONSENTIMENTO_JA_REGISTRADO', {}),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Registrar consentimento' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar registro' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível registrar o consentimento. O consentimento já foi registrado',
    )
  })

  it('mostra a data quando o consentimento já existe', async () => {
    vi.mocked(buscarCandidato).mockResolvedValue({
      ...ELEGIVEL,
      consentimento: { registradoEm: '2026-10-30', registradoPor: null },
    })
    renderizar()

    expect(await screen.findByText(/em 30\/10\/2026/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar consentimento' })).not.toBeInTheDocument()
  })

  it('não oferece o registro para candidato que não está elegível', async () => {
    vi.mocked(buscarCandidato).mockResolvedValue({ ...ELEGIVEL, status: 'INELEGIVEL' })
    renderizar()

    expect(await screen.findByText(/só pode ser registrado para candidato elegível/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Registrar consentimento' })).not.toBeInTheDocument()
  })
})

const COM_CONSENTIMENTO: Candidato = {
  ...ELEGIVEL,
  consentimento: { registradoEm: '2026-11-03', registradoPor: 'Carlos Coordenador' },
}

describe('CandidatoDetalhePage – inclusão', () => {
  it('pede o consentimento antes de liberar a inclusão', async () => {
    renderizar()

    expect(await screen.findByText('18 de 40 vagas')).toBeInTheDocument()
    expect(screen.getByText('Registre o consentimento do candidato antes de incluir.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Incluir no estudo' })).toBeDisabled()
  })

  it('inclui após confirmar e mostra as vagas ocupadas', async () => {
    vi.mocked(buscarCandidato)
      .mockResolvedValueOnce(COM_CONSENTIMENTO)
      .mockResolvedValueOnce({ ...COM_CONSENTIMENTO, status: 'INCLUIDO', dataInclusao: '2026-11-04' })
    vi.mocked(incluirCandidato).mockResolvedValue({ vagasOcupadas: 19, limiteParticipantes: 40 })
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Incluir no estudo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar inclusão' }))

    expect(incluirCandidato).toHaveBeenCalledWith(3)
    expect(await screen.findByText('19 de 40 vagas')).toBeInTheDocument()
    expect(screen.getByText(/em 04\/11\/2026/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Candidato incluído no estudo.')
    expect(screen.queryByRole('button', { name: 'Incluir no estudo' })).not.toBeInTheDocument()
  })

  it('bloqueia a inclusão com vagas esgotadas', async () => {
    vi.mocked(buscarCandidato).mockResolvedValue(COM_CONSENTIMENTO)
    vi.mocked(contarIncluidos).mockResolvedValue(40)
    renderizar()

    expect(await screen.findByText(/Todas as vagas do estudo estão ocupadas/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Incluir no estudo' })).toBeDisabled()
  })

  it('bloqueia a inclusão com o estudo fora de recrutamento', async () => {
    vi.mocked(buscarCandidato).mockResolvedValue(COM_CONSENTIMENTO)
    vi.mocked(buscarEstudo).mockResolvedValue({ ...ESTUDO, estado: 'EXECUCAO' })
    renderizar()

    expect(await screen.findByText('A inclusão só fica liberada quando o estudo estiver em Recrutamento.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Incluir no estudo' })).toBeDisabled()
  })

  it('mostra a mensagem do bloqueio quando a API recusa a inclusão', async () => {
    vi.mocked(buscarCandidato).mockResolvedValue(COM_CONSENTIMENTO)
    vi.mocked(incluirCandidato).mockRejectedValue(
      new ErroCandidatoApi('A operação conflita com uma regra do estudo.', 409, 'CONSENTIMENTO_NAO_REGISTRADO', {}),
    )
    renderizar()

    await userEvent.click(await screen.findByRole('button', { name: 'Incluir no estudo' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar inclusão' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Consentimento não registrado. Registre o consentimento do candidato antes de incluir.',
    )
  })
})

const CONTA_NOVA = {
  usuarioId: 50,
  email: 'ana.ribeiro@exemplo.test',
  ativo: true,
  contaExistente: false,
  senhaProvisoria: 'Kx7#pQ2m',
}

describe('CandidatoDetalhePage – acesso do participante (T-86)', () => {
  function incluidoDepois() {
    vi.mocked(buscarCandidato)
      .mockResolvedValueOnce(COM_CONSENTIMENTO)
      .mockResolvedValue({ ...COM_CONSENTIMENTO, status: 'INCLUIDO', dataInclusao: '2026-11-04', possuiConta: true })
  }

  async function incluir(usuario: ReturnType<typeof userEvent.setup>) {
    await usuario.click(await screen.findByRole('button', { name: 'Incluir no estudo' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar inclusão' }))
  }

  it('mostra o e-mail e a senha inicial num diálogo depois de incluir', async () => {
    incluidoDepois()
    vi.mocked(incluirCandidato).mockResolvedValue({ vagasOcupadas: 19, limiteParticipantes: 40, conta: CONTA_NOVA })
    const usuario = userEvent.setup()
    renderizar()

    await incluir(usuario)

    const dialogo = await screen.findByRole('dialog', { name: 'Acesso do participante' })
    expect(within(dialogo).getByText('ana.ribeiro@exemplo.test')).toBeInTheDocument()
    expect(within(dialogo).getByText('Kx7#pQ2m')).toBeInTheDocument()
    expect(
      within(dialogo).getByText('Esta senha é exibida apenas uma vez. Entregue ao participante.'),
    ).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Copiar' })).toHaveFocus()
  })

  it('copia o e-mail e a senha', async () => {
    incluidoDepois()
    vi.mocked(incluirCandidato).mockResolvedValue({ vagasOcupadas: 19, limiteParticipantes: 40, conta: CONTA_NOVA })
    const usuario = userEvent.setup()
    renderizar()

    await incluir(usuario)
    await usuario.click(await screen.findByRole('button', { name: 'Copiar' }))

    expect(await navigator.clipboard.readText()).toBe('E-mail: ana.ribeiro@exemplo.test\nSenha inicial: Kx7#pQ2m')
    expect(screen.getByText('E-mail e senha copiados.')).toBeInTheDocument()
  })

  it('ao fechar, a senha some e não volta ao reabrir a tela', async () => {
    incluidoDepois()
    vi.mocked(incluirCandidato).mockResolvedValue({ vagasOcupadas: 19, limiteParticipantes: 40, conta: CONTA_NOVA })
    const usuario = userEvent.setup()
    const { unmount } = renderizar()

    await incluir(usuario)
    await usuario.click(await screen.findByRole('button', { name: 'Fechar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Kx7#pQ2m')).not.toBeInTheDocument()
    expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('Kx7#pQ2m')

    unmount()
    renderizar()
    expect(await screen.findByText('Conta de acesso vinculada')).toBeInTheDocument()
    expect(screen.queryByText('Kx7#pQ2m')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('avisa que o participante já tinha conta, sem diálogo de senha', async () => {
    incluidoDepois()
    vi.mocked(incluirCandidato).mockResolvedValue({
      vagasOcupadas: 19,
      limiteParticipantes: 40,
      conta: { ...CONTA_NOVA, contaExistente: true, senhaProvisoria: null },
    })
    const usuario = userEvent.setup()
    renderizar()

    await incluir(usuario)

    expect(await screen.findByRole('status')).toHaveTextContent(
      'O participante já tinha conta; ele usa o mesmo acesso.',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mostra o selo só para o participante incluído com conta', async () => {
    vi.mocked(buscarCandidato).mockResolvedValue({ ...COM_CONSENTIMENTO, status: 'INCLUIDO', possuiConta: true })
    const { unmount } = renderizar()
    expect(await screen.findByText('Conta de acesso vinculada')).toBeInTheDocument()
    unmount()

    vi.mocked(buscarCandidato).mockResolvedValue({ ...COM_CONSENTIMENTO, possuiConta: false })
    renderizar()
    expect(await screen.findByRole('heading', { name: 'Ana Ribeiro' })).toBeInTheDocument()
    expect(screen.queryByText('Conta de acesso vinculada')).not.toBeInTheDocument()
  })

  it('explica o erro de e-mail que já pertence a alguém da equipe', async () => {
    vi.mocked(buscarCandidato).mockResolvedValue(COM_CONSENTIMENTO)
    vi.mocked(incluirCandidato).mockRejectedValue(
      new ErroCandidatoApi(
        'O e-mail do candidato já pertence a um usuário da equipe. Corrija o e-mail antes de incluir',
        409,
        'EMAIL_DE_OUTRO_PERFIL',
        {},
      ),
    )
    const usuario = userEvent.setup()
    renderizar()

    await incluir(usuario)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'E-mail já usado por alguém da equipe. O e-mail deste candidato pertence a um usuário da equipe',
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
