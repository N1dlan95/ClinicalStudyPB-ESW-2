// Integração da agenda de visitas com a API (RF12 e RF13 — Release 2, tasks 3755 e 3758 do backend):
//   GET   /estudos/{id}/visitas            agenda do estudo (filtros status, de e ate)
//   GET   /visitas/{id}                    uma visita (coordenador)
//   POST  /candidatos/{id}/visitas         agendar (coordenador): { visitaPrevistaId, dataHora, local }
//   PATCH /visitas/{id}/status             realizada, ausente ou cancelada (coordenador): { status, observacao }
// A API devolve a visita com participante (candidatoId e nome), visita prevista (id, ordem e nome), data e hora e a
// janela já calculada. O e-mail e a situação do participante e o dia previsto da visita vêm da lista de candidatos
// e da lista de visitas previstas, quando o perfil pode consultá-las; sem elas, a tela mostra o que a API trouxe.
import { isAxiosError } from 'axios'
import { api } from '../../services/api'
import { listarCandidatos } from '../candidatos/candidatosService'
import type { Candidato } from '../candidatos/tipos'
import { listarVisitasPrevistas } from '../estudos/estudosService'
import type { VisitaPrevista } from '../estudos/tipos'
import type {
  AgendamentoVisitaEntrada,
  CampoAgendamentoVisita,
  ErrosAgendamentoVisita,
  RegistroExecucaoVisitaEntrada,
  StatusVisitaAgendada,
  VisitaAgendada,
} from './tipos'
import { diferencaDiasIso, somarDiasIso } from './validacao'

interface ErroApi {
  status?: number
  codigo?: string
  mensagem?: string
  detalhes?: { campo?: string; mensagem?: string }[]
}

// Formato da API (VisitaResponse no backend, VisitaResposta no openapi.yaml)
export interface VisitaApi {
  id: number
  estudoId: number
  participante: { candidatoId: number; nome: string }
  visitaPrevista: { id: number; ordem: number; nome: string }
  dataHora: string // aaaa-mm-ddThh:mm:ss
  local: string | null
  status: StatusVisitaAgendada
  observacao: string | null
  janela: { inicio: string; fim: string } | null
  agendadaPor: string | null
  statusRegistradoEm: string | null
  statusRegistradoPor: string | null
}

export class ErroAgendaApi extends Error {
  readonly status: number | null
  readonly codigo: string | null
  readonly errosCampos: ErrosAgendamentoVisita

  constructor(
    mensagem: string,
    status: number | null,
    codigo: string | null,
    errosCampos: ErrosAgendamentoVisita = {},
  ) {
    super(mensagem)
    this.status = status
    this.codigo = codigo
    this.errosCampos = errosCampos
  }
}

const CAMPOS: CampoAgendamentoVisita[] = [
  'participanteId',
  'visitaPrevistaId',
  'dataAgendada',
  'horaAgendada',
  'motivoCancelamento',
]

// Campos da API que correspondem a campos do formulário
const CAMPO_DA_API: Record<string, CampoAgendamentoVisita> = {
  dataHora: 'dataAgendada',
  visitaPrevistaId: 'visitaPrevistaId',
  observacao: 'motivoCancelamento',
}

function mensagemPorStatus(status: number | null): string {
  switch (status) {
    case 400:
      return 'Revise os dados informados para o agendamento.'
    case 403:
      return 'Seu perfil não tem permissão para esta ação.'
    case 404:
      return 'Estudo, participante ou visita não encontrados.'
    case 409:
      return 'A operação conflita com uma regra de agendamento do estudo.'
    default:
      return 'Não foi possível falar com o servidor. Tente novamente.'
  }
}

export function traduzirErro(erro: unknown): ErroAgendaApi {
  if (erro instanceof ErroAgendaApi) return erro
  if (!isAxiosError(erro)) return new ErroAgendaApi(mensagemPorStatus(null), null, null, {})
  const status = erro.response?.status ?? null
  const corpo = (erro.response?.data ?? {}) as ErroApi
  const errosCampos: ErrosAgendamentoVisita = {}

  for (const d of corpo.detalhes ?? []) {
    const campo = CAMPOS.find((c) => c === d.campo) ?? (d.campo ? CAMPO_DA_API[d.campo] : undefined)
    if (campo && d.mensagem && !errosCampos[campo]) {
      errosCampos[campo] = d.mensagem
    }
  }

  const codigo = corpo.codigo ?? null
  if (codigo === 'VISITA_JA_AGENDADA' && !errosCampos.visitaPrevistaId) {
    errosCampos.visitaPrevistaId =
      corpo.mensagem ??
      'Visita já agendada: este participante já possui um agendamento ativo para esta visita prevista.'
  } else if (codigo === 'PARTICIPANTE_NAO_INCLUIDO' && !errosCampos.participanteId) {
    errosCampos.participanteId =
      corpo.mensagem ??
      'Participante não incluído: apenas participantes com status Incluído podem ter visitas agendadas.'
  }

  const mensagem =
    status === 400 && !corpo.mensagem
      ? mensagemPorStatus(status)
      : (corpo.mensagem ?? mensagemPorStatus(status))
  return new ErroAgendaApi(mensagem, status, codigo, errosCampos)
}

async function chamar<T>(requisicao: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await requisicao()).data
  } catch (erro) {
    throw traduzirErro(erro)
  }
}

// ---------------------------------------------------------------------------
// Conversão da resposta da API para o formato usado pelas telas da agenda
// ---------------------------------------------------------------------------

export interface DadosComplementares {
  candidatos: Map<number, Candidato>
  visitasPrevistas: Map<number, VisitaPrevista>
}

const SEM_COMPLEMENTO: DadosComplementares = { candidatos: new Map(), visitasPrevistas: new Map() }

// Lista de candidatos (coordenador) e de visitas previstas (pesquisador, coordenador e administrador).
// Quem não pode consultar uma delas continua vendo a agenda, só sem os dados extras.
export async function carregarComplementos(estudoId: number): Promise<DadosComplementares> {
  const [candidatos, previstas] = await Promise.allSettled([
    listarCandidatos(estudoId),
    listarVisitasPrevistas(estudoId),
  ])
  return {
    candidatos: new Map(candidatos.status === 'fulfilled' ? candidatos.value.map((c) => [c.id, c]) : []),
    visitasPrevistas: new Map(previstas.status === 'fulfilled' ? previstas.value.map((v) => [v.id, v]) : []),
  }
}

// Data sugerida: o meio da janela calculada pela API (inclusão + dia previsto)
function meioDaJanela(janela: VisitaApi['janela']): string | null {
  if (!janela) return null
  return somarDiasIso(janela.inicio, Math.round(diferencaDiasIso(janela.fim, janela.inicio) / 2))
}

export function deVisitaApi(v: VisitaApi, extras: DadosComplementares = SEM_COMPLEMENTO): VisitaAgendada {
  const candidato = extras.candidatos.get(v.participante.candidatoId)
  const prevista = extras.visitasPrevistas.get(v.visitaPrevista.id)
  const [data, hora = ''] = v.dataHora.split('T')
  const dataAgendada = data.slice(0, 10)
  const cancelada = v.status === 'CANCELADA'
  return {
    id: v.id,
    estudoId: v.estudoId,
    participante: {
      id: v.participante.candidatoId,
      nome: v.participante.nome,
      email: candidato?.email ?? '',
      status: candidato?.status ?? 'INCLUIDO',
      dataInclusao: candidato?.dataInclusao ?? null,
    },
    visitaPrevista: {
      id: v.visitaPrevista.id,
      ordem: v.visitaPrevista.ordem,
      nome: v.visitaPrevista.nome,
      diaPrevisto: prevista?.diaPrevisto ?? null,
      janelaDias: prevista?.janelaDias ?? null,
    },
    dataAgendada,
    horaAgendada: hora.slice(0, 5),
    dataSugerida: meioDaJanela(v.janela),
    janelaInicio: v.janela?.inicio ?? null,
    janelaFim: v.janela?.fim ?? null,
    foraDaJanela: v.janela ? dataAgendada < v.janela.inicio || dataAgendada > v.janela.fim : false,
    local: v.local,
    // A API guarda um texto só: o motivo, no cancelamento, ou a anotação do registro, nos demais status
    observacoes: cancelada ? null : v.observacao,
    status: v.status,
    motivoCancelamento: cancelada ? v.observacao : null,
    atualizadoEm: v.statusRegistradoEm,
    atualizadoPor: v.statusRegistradoPor,
  }
}

// ---------------------------------------------------------------------------
// Funções usadas pelas telas
// ---------------------------------------------------------------------------

export async function listarVisitasAgendadas(
  estudoId: number,
  status?: StatusVisitaAgendada,
): Promise<VisitaAgendada[]> {
  const [visitas, extras] = await Promise.all([
    chamar(() => api.get<VisitaApi[]>(`/estudos/${estudoId}/visitas`, status ? { params: { status } } : undefined)),
    carregarComplementos(estudoId),
  ])
  return visitas.map((v) => deVisitaApi(v, extras))
}

export async function buscarVisitaAgendada(estudoId: number, visitaId: number): Promise<VisitaAgendada> {
  const [visita, extras] = await Promise.all([
    chamar(() => api.get<VisitaApi>(`/visitas/${visitaId}`)),
    carregarComplementos(estudoId),
  ])
  return deVisitaApi(visita, extras)
}

// O agendamento é feito pelo participante (candidato incluído). A API recebe data e hora juntas.
export async function agendarVisita(estudoId: number, dados: AgendamentoVisitaEntrada): Promise<VisitaAgendada> {
  const visita = await chamar(() =>
    api.post<VisitaApi>(`/candidatos/${dados.participanteId}/visitas`, {
      visitaPrevistaId: dados.visitaPrevistaId,
      dataHora: `${dados.dataAgendada}T${dados.horaAgendada}:00`,
      local: dados.local,
    }),
  )
  return deVisitaApi({ ...visita, estudoId: visita.estudoId ?? estudoId })
}

// No cancelamento, o motivo vai na observação (obrigatória para CANCELADA); nos demais, a anotação do atendimento.
export async function registrarExecucaoVisita(
  estudoId: number,
  visitaId: number,
  dados: RegistroExecucaoVisitaEntrada,
): Promise<VisitaAgendada> {
  const observacao = dados.status === 'CANCELADA' ? dados.motivoCancelamento : dados.observacoes
  const visita = await chamar(() =>
    api.patch<VisitaApi>(`/visitas/${visitaId}/status`, { status: dados.status, observacao }),
  )
  return deVisitaApi({ ...visita, estudoId: visita.estudoId ?? estudoId })
}
