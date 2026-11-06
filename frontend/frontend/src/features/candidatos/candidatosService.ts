import { isAxiosError } from 'axios'
import { api } from '../../services/api'
import type {
  CampoCandidato,
  Candidato,
  CandidatoEntrada,
  ErrosCandidato,
  ResultadoInclusao,
  StatusCandidato,
} from './tipos'

// Integração com a API de candidatos (RF08). Contrato provisório: ver tipos.ts.

interface Pagina<T> {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
}

interface ErroApi {
  codigo?: string
  mensagem?: string
  detalhes?: { campo?: string; mensagem?: string }[]
}

const TAMANHO_PAGINA = 100

// Erro da API traduzido para a tela: mensagem geral + erros por campo do formulário
export class ErroCandidatoApi extends Error {
  readonly status: number | null
  readonly codigo: string | null
  readonly errosCampos: ErrosCandidato

  constructor(mensagem: string, status: number | null, codigo: string | null, errosCampos: ErrosCandidato) {
    super(mensagem)
    this.status = status
    this.codigo = codigo
    this.errosCampos = errosCampos
  }
}

const CAMPOS: CampoCandidato[] = ['nome', 'email', 'telefone', 'dataNascimento']

function mensagemPorStatus(status: number | null): string {
  switch (status) {
    case 400:
      return 'Revise os dados informados.'
    case 403:
      return 'Seu perfil não tem permissão para esta ação.'
    case 404:
      return 'Estudo ou candidato não encontrado.'
    case 409:
      return 'A operação conflita com uma regra do estudo.'
    default:
      return 'Não foi possível falar com o servidor. Tente novamente.'
  }
}

export function traduzirErro(erro: unknown): ErroCandidatoApi {
  if (erro instanceof ErroCandidatoApi) return erro
  if (!isAxiosError(erro)) return new ErroCandidatoApi(mensagemPorStatus(null), null, null, {})
  const status = erro.response?.status ?? null
  const corpo = (erro.response?.data ?? {}) as ErroApi
  const errosCampos: ErrosCandidato = {}
  for (const d of corpo.detalhes ?? []) {
    const campo = CAMPOS.find((c) => c === d.campo)
    if (campo && d.mensagem && !errosCampos[campo]) errosCampos[campo] = d.mensagem
  }
  // E-mail repetido no mesmo estudo (regra da task 3558): aparece no próprio campo
  if (status === 409 && corpo.codigo?.includes('EMAIL') && !errosCampos.email) {
    errosCampos.email = corpo.mensagem ?? 'Este e-mail já está cadastrado neste estudo.'
  }
  const mensagem = status === 400 || !corpo.mensagem ? mensagemPorStatus(status) : corpo.mensagem
  return new ErroCandidatoApi(mensagem, status, corpo.codigo ?? null, errosCampos)
}

async function chamar<T>(requisicao: () => Promise<{ data: T }>): Promise<T> {
  try {
    return (await requisicao()).data
  } catch (erro) {
    throw traduzirErro(erro)
  }
}

const rota = (estudoId: number) => `/estudos/${estudoId}/candidatos`

// ---------------------------------------------------------------------------
// Funções usadas pelas telas
// ---------------------------------------------------------------------------
export async function listarCandidatos(estudoId: number, status?: StatusCandidato): Promise<Candidato[]> {
  const params: Record<string, string | number> = { size: TAMANHO_PAGINA }
  if (status) params.status = status
  const pagina = await chamar(() => api.get<Pagina<Candidato>>(rota(estudoId), { params }))
  return pagina.content
}

export function buscarCandidato(estudoId: number, id: number): Promise<Candidato> {
  return chamar(() => api.get<Candidato>(`${rota(estudoId)}/${id}`))
}

export function criarCandidato(estudoId: number, dados: CandidatoEntrada): Promise<Candidato> {
  return chamar(() => api.post<Candidato>(rota(estudoId), dados))
}

export function atualizarCandidato(estudoId: number, id: number, dados: CandidatoEntrada): Promise<Candidato> {
  return chamar(() => api.put<Candidato>(`${rota(estudoId)}/${id}`, dados))
}

// RF10: registra o consentimento simulado. Regras do backend (task 3563): só para candidato
// ELEGIVEL e sem registro anterior. Depois do registro, busca o candidato de novo para mostrar
// a data e o responsável exatamente como ficaram gravados.
export async function registrarConsentimento(estudoId: number, candidatoId: number): Promise<Candidato> {
  await chamar(() => api.post(`/candidatos/${candidatoId}/consentimento`))
  return buscarCandidato(estudoId, candidatoId)
}

// Vagas ocupadas = candidatos INCLUIDO no estudo
export async function contarIncluidos(estudoId: number): Promise<number> {
  return (await listarCandidatos(estudoId, 'INCLUIDO')).length
}

// RF11: inclui o candidato no estudo (task 3565). O backend valida, nesta ordem: estudo em
// RECRUTAMENTO, candidato ELEGIVEL, consentimento registrado e vaga disponível; muda o status
// para INCLUIDO e devolve as vagas ocupadas e o total.
export function incluirCandidato(candidatoId: number): Promise<ResultadoInclusao> {
  return chamar(() => api.post<ResultadoInclusao>(`/candidatos/${candidatoId}/inclusao`))
}
