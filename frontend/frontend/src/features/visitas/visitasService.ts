import { isAxiosError } from 'axios'
import { api } from '../../services/api'
import type { ResultadosEntrada, ResultadosVisita, Visita } from './tipos'

// Integração com a API de visitas e resultados (RF14, task 3763 do backend)

interface ErroApi {
  codigo?: string
  mensagem?: string
}

export class ErroVisitaApi extends Error {
  readonly status: number | null
  readonly codigo: string | null

  constructor(mensagem: string, status: number | null, codigo: string | null) {
    super(mensagem)
    this.status = status
    this.codigo = codigo
  }
}

// Mensagens por código de erro da API (Erro.codigo). O que não estiver aqui usa a mensagem da API.
const MENSAGEM_POR_CODIGO: Record<string, string> = {
  VISITA_NAO_REALIZADA: 'Os resultados só podem ser registrados depois que a visita for marcada como realizada.',
  ATIVIDADE_FORA_DA_VISITA: 'Uma das atividades não pertence a esta visita. Recarregue a página e tente de novo.',
  ESTUDO_ENCERRADO: 'O estudo está encerrado: os resultados não podem mais ser alterados.',
  VALIDACAO: 'Revise os resultados informados: o resultado é obrigatório e cada campo aceita até 500 caracteres.',
  SEM_PERMISSAO: 'Seu perfil não tem permissão para esta ação.',
  NAO_ENCONTRADO: 'Visita não encontrada.',
}

function mensagemPorStatus(status: number | null): string {
  switch (status) {
    case 400:
      return MENSAGEM_POR_CODIGO.VALIDACAO
    case 403:
      return MENSAGEM_POR_CODIGO.SEM_PERMISSAO
    case 404:
      return MENSAGEM_POR_CODIGO.NAO_ENCONTRADO
    case 409:
      return 'A operação conflita com uma regra do estudo.'
    default:
      return 'Não foi possível falar com o servidor. Tente novamente.'
  }
}

export function traduzirErro(erro: unknown): ErroVisitaApi {
  if (erro instanceof ErroVisitaApi) return erro
  if (!isAxiosError(erro)) return new ErroVisitaApi(mensagemPorStatus(null), null, null)
  const status = erro.response?.status ?? null
  const corpo = (erro.response?.data ?? {}) as ErroApi
  const codigo = corpo.codigo ?? null
  const mensagem =
    (codigo && MENSAGEM_POR_CODIGO[codigo]) || (status !== 400 && corpo.mensagem) || mensagemPorStatus(status)
  return new ErroVisitaApi(mensagem, status, codigo)
}

async function chamar<T>(requisicao: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await requisicao()).data
  } catch (erro) {
    throw traduzirErro(erro)
  }
}

// ---------------------------------------------------------------------------
// Funções usadas pelas telas
// ---------------------------------------------------------------------------

// Só o coordenador pode chamar (SecurityConfig: /visitas/** é do coordenador)
export function buscarVisita(visitaId: number): Promise<Visita> {
  return chamar(() => api.get<Visita>(`/visitas/${visitaId}`))
}

// Pesquisador, coordenador e administrador: todas as atividades, com o resultado ou vazio
export function listarResultados(visitaId: number): Promise<ResultadosVisita> {
  return chamar(() => api.get<ResultadosVisita>(`/visitas/${visitaId}/resultados`))
}

// Só o coordenador. Grava em lote; a atividade que já tem resultado é substituída.
export function registrarResultados(visitaId: number, dados: ResultadosEntrada): Promise<ResultadosVisita> {
  return chamar(() => api.put<ResultadosVisita>(`/visitas/${visitaId}/resultados`, dados))
}
