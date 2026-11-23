// Integração com a API de agenda de visitas do estudo (RF12 e RF13 — Release 2).
// Enquanto o endpoint /estudos/{id}/visitas-agendadas ainda não estiver disponível no backend
// (retornando 403 ou 404), o serviço utiliza armazenamento local (localStorage) com dados de
// demonstração para permitir a navegação e o teste completo do fluxo no front-end.
import { isAxiosError } from 'axios'
import { api } from '../../services/api'
import type {
  AgendamentoVisitaEntrada,
  CampoAgendamentoVisita,
  ErrosAgendamentoVisita,
  RegistroExecucaoVisitaEntrada,
  StatusVisitaAgendada,
  VisitaAgendada,
} from './tipos'
import { analisarJanelaAgendamento } from './validacao'

interface ErroApi {
  status?: number
  codigo?: string
  mensagem?: string
  detalhes?: { campo?: string; mensagem?: string }[]
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

function mensagemPorStatus(status: number | null): string {
  switch (status) {
    case 400:
      return 'Revise os dados informados para o agendamento.'
    case 403:
      return 'Seu perfil não tem permissão para esta ação.'
    case 404:
      return 'Estudo ou visita agendada não encontrada.'
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
    const campo = CAMPOS.find((c) => c === d.campo)
    if (campo && d.mensagem && !errosCampos[campo]) {
      errosCampos[campo] = d.mensagem
    }
  }

  const codigo = corpo.codigo ?? null
  if (codigo === 'DATA_NO_PASSADO' && !errosCampos.dataAgendada) {
    errosCampos.dataAgendada =
      corpo.mensagem ?? 'Data no passado: a data do agendamento não pode ser anterior a hoje.'
  } else if (codigo === 'VISITA_JA_AGENDADA' && !errosCampos.visitaPrevistaId) {
    errosCampos.visitaPrevistaId =
      corpo.mensagem ??
      'Visita já agendada: este participante já possui um agendamento ativo para esta visita prevista.'
  } else if (codigo === 'PARTICIPANTE_NAO_INCLUIDO' && !errosCampos.participanteId) {
    errosCampos.participanteId =
      corpo.mensagem ??
      'Participante não incluído: apenas participantes com status Incluído podem ter visitas agendadas.'
  } else if (codigo === 'MOTIVO_OBRIGATORIO' && !errosCampos.motivoCancelamento) {
    errosCampos.motivoCancelamento =
      corpo.mensagem ?? 'Motivo obrigatório: informe o motivo do cancelamento da visita.'
  }

  const mensagem =
    status === 400 && !corpo.mensagem
      ? mensagemPorStatus(status)
      : (corpo.mensagem ?? mensagemPorStatus(status))
  return new ErroAgendaApi(mensagem, status, codigo, errosCampos)
}

const CHAVE_STORAGE = (estudoId: number) => `clinicalstudypb.agenda.estudo.${estudoId}`
const CHAVE_VISITAS_PREVISTAS = (estudoId: number) =>
  `clinicalstudypb.visitasPrevistas.estudo.${estudoId}`

export function salvarCacheVisitasPrevistas(estudoId: number, visitas: unknown[]) {
  try {
    localStorage.setItem(CHAVE_VISITAS_PREVISTAS(estudoId), JSON.stringify(visitas))
  } catch {
    // Ignora erro de escrita do localStorage
  }
}

export function lerCacheVisitasPrevistas<T>(estudoId: number): T[] {
  try {
    const salvo = localStorage.getItem(CHAVE_VISITAS_PREVISTAS(estudoId))
    if (salvo) return JSON.parse(salvo) as T[]
  } catch {
    // Ignora erro de leitura do localStorage
  }
  return []
}

function carregarAgendaLocal(estudoId: number): VisitaAgendada[] {
  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE(estudoId))
    if (salvo) return JSON.parse(salvo) as VisitaAgendada[]
  } catch {
    // Ignora erro de leitura do localStorage
  }
  return []
}

function salvarAgendaLocal(estudoId: number, lista: VisitaAgendada[]) {
  try {
    localStorage.setItem(CHAVE_STORAGE(estudoId), JSON.stringify(lista))
  } catch {
    // Ignora erro de escrita do localStorage
  }
}

function rotaNaoImplementadaNoBackend(erro: unknown): boolean {
  return (
    isAxiosError(erro) &&
    (erro.response?.status === 404 || erro.response?.status === 403)
  )
}

const rotaEstudo = (estudoId: number) => `/estudos/${estudoId}/visitas-agendadas`

export async function listarVisitasAgendadas(
  estudoId: number,
  status?: StatusVisitaAgendada,
): Promise<VisitaAgendada[]> {
  const params = status ? { status } : undefined
  try {
    const resposta = await api.get<VisitaAgendada[]>(
      rotaEstudo(estudoId),
      params ? { params } : undefined,
    )
    return resposta.data
  } catch (erro) {
    if (rotaNaoImplementadaNoBackend(erro)) {
      const todas = carregarAgendaLocal(estudoId)
      return status ? todas.filter((v) => v.status === status) : todas
    }
    throw traduzirErro(erro)
  }
}

export async function buscarVisitaAgendada(
  estudoId: number,
  visitaId: number,
): Promise<VisitaAgendada> {
  try {
    return (await api.get<VisitaAgendada>(`${rotaEstudo(estudoId)}/${visitaId}`)).data
  } catch (erro) {
    if (rotaNaoImplementadaNoBackend(erro)) {
      const encontrada = carregarAgendaLocal(estudoId).find((v) => v.id === visitaId)
      if (encontrada) return encontrada
    }
    throw traduzirErro(erro)
  }
}

export interface ContextoCriacaoLocal {
  participanteNome?: string
  participanteEmail?: string
  dataInclusao?: string | null
  visitaOrdem?: number
  visitaNome?: string
  diaPrevisto?: number
  janelaDias?: number | null
}

export async function agendarVisita(
  estudoId: number,
  dados: AgendamentoVisitaEntrada,
  contextoLocal?: ContextoCriacaoLocal,
): Promise<VisitaAgendada> {
  try {
    return (await api.post<VisitaAgendada>(rotaEstudo(estudoId), dados)).data
  } catch (erro) {
    if (rotaNaoImplementadaNoBackend(erro)) {
      const atuais = carregarAgendaLocal(estudoId)
      const diaPrevisto = contextoLocal?.diaPrevisto ?? 15
      const janelaDias = contextoLocal?.janelaDias ?? 2
      const dataInclusao = contextoLocal?.dataInclusao ?? '2026-11-10'
      const analise = analisarJanelaAgendamento(dados.dataAgendada, dataInclusao, {
        diaPrevisto,
        janelaDias,
      })
      const nova: VisitaAgendada = {
        id: Date.now(),
        estudoId,
        participante: {
          id: dados.participanteId,
          nome: contextoLocal?.participanteNome ?? `Participante #${dados.participanteId}`,
          email: contextoLocal?.participanteEmail ?? 'participante@exemplo.test',
          status: 'INCLUIDO',
          dataInclusao,
        },
        visitaPrevista: {
          id: dados.visitaPrevistaId,
          ordem: contextoLocal?.visitaOrdem ?? 1,
          nome: contextoLocal?.visitaNome ?? `Visita prevista #${dados.visitaPrevistaId}`,
          diaPrevisto,
          janelaDias,
        },
        dataAgendada: dados.dataAgendada,
        horaAgendada: dados.horaAgendada,
        dataSugerida: analise?.dataSugerida ?? dados.dataAgendada,
        janelaInicio: analise?.janelaInicio ?? null,
        janelaFim: analise?.janelaFim ?? null,
        foraDaJanela: analise?.foraDaJanela ?? false,
        local: dados.local,
        observacoes: dados.observacoes,
        status: 'AGENDADA',
        motivoCancelamento: null,
      }
      salvarAgendaLocal(estudoId, [...atuais, nova])
      return nova
    }
    throw traduzirErro(erro)
  }
}

export async function registrarExecucaoVisita(
  estudoId: number,
  visitaId: number,
  dados: RegistroExecucaoVisitaEntrada,
): Promise<VisitaAgendada> {
  try {
    return (
      await api.patch<VisitaAgendada>(`${rotaEstudo(estudoId)}/${visitaId}/status`, dados)
    ).data
  } catch (erro) {
    if (rotaNaoImplementadaNoBackend(erro)) {
      const atuais = carregarAgendaLocal(estudoId)
      const atualizadas = atuais.map((v) =>
        v.id === visitaId
          ? {
              ...v,
              status: dados.status,
              observacoes: dados.observacoes,
              motivoCancelamento: dados.motivoCancelamento,
            }
          : v,
      )
      salvarAgendaLocal(estudoId, atualizadas)
      const alvo = atualizadas.find((v) => v.id === visitaId)
      if (alvo) return alvo
    }
    throw traduzirErro(erro)
  }
}
