import { isAxiosError } from 'axios'
import { api } from '../../services/api'
import type { Perfil } from '../auth/tipos'
import type { CampoEstudo, ErrosEstudo, Estudo, EstudoEntrada, Pesquisador } from './tipos'

// Integração com a API de estudos (RF04). Contrato: Docs/ClinicalStudyPB-Docs/api/openapi.yaml

interface Pagina<T> {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
}

interface UsuarioResposta {
  id: number
  nome: string
  perfil: Perfil
  ativo: boolean
}

interface ErroApi {
  status?: number
  codigo?: string
  mensagem?: string
  detalhes?: { campo?: string; mensagem?: string }[]
}

// A tela filtra e conta localmente, então busca tudo de uma vez (a API aceita até 100 por página)
const TAMANHO_PAGINA = 100

// Erro da API traduzido para a tela: mensagem geral + erros por campo do formulário
export class ErroEstudoApi extends Error {
  readonly status: number | null
  readonly codigo: string | null
  readonly errosCampos: ErrosEstudo

  constructor(mensagem: string, status: number | null, codigo: string | null, errosCampos: ErrosEstudo) {
    super(mensagem)
    this.status = status
    this.codigo = codigo
    this.errosCampos = errosCampos
  }
}

// Nome do campo na API -> campo do formulário
const CAMPO_DA_API: Record<string, CampoEstudo> = {
  titulo: 'titulo',
  objetivo: 'objetivo',
  responsavelId: 'responsavelId',
  dataInicio: 'dataInicio',
  dataFim: 'dataFim',
  limiteParticipantes: 'limiteParticipantes',
}

function mensagemPorStatus(status: number | null): string {
  switch (status) {
    case 400:
      return 'Revise os dados informados.'
    case 403:
      return 'Seu perfil não tem permissão para esta ação.'
    case 404:
      return 'Estudo não encontrado.'
    case 409:
      return 'A operação conflita com uma regra do estudo.'
    default:
      return 'Não foi possível falar com o servidor. Tente novamente.'
  }
}

export function traduzirErro(erro: unknown): ErroEstudoApi {
  if (erro instanceof ErroEstudoApi) return erro
  if (!isAxiosError(erro)) return new ErroEstudoApi(mensagemPorStatus(null), null, null, {})
  const status = erro.response?.status ?? null
  const corpo = (erro.response?.data ?? {}) as ErroApi
  const errosCampos: ErrosEstudo = {}
  for (const detalhe of corpo.detalhes ?? []) {
    const campo = detalhe.campo ? CAMPO_DA_API[detalhe.campo] : undefined
    if (campo && detalhe.mensagem && !errosCampos[campo]) errosCampos[campo] = detalhe.mensagem
  }
  const mensagem = status === 400 || !corpo.mensagem ? mensagemPorStatus(status) : corpo.mensagem
  return new ErroEstudoApi(mensagem, status, corpo.codigo ?? null, errosCampos)
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
export async function listarEstudos(): Promise<Estudo[]> {
  const pagina = await chamar(() =>
    api.get<Pagina<Estudo>>('/estudos', { params: { size: TAMANHO_PAGINA } }),
  )
  return pagina.content
}

export function buscarEstudo(id: number): Promise<Estudo> {
  return chamar(() => api.get<Estudo>(`/estudos/${id}`))
}

export function criarEstudo(dados: EstudoEntrada): Promise<Estudo> {
  return chamar(() => api.post<Estudo>('/estudos', dados))
}

export function atualizarEstudo(id: number, dados: EstudoEntrada): Promise<Estudo> {
  return chamar(() => api.put<Estudo>(`/estudos/${id}`, dados))
}

// Responsáveis possíveis: usuários ativos com perfil PESQUISADOR.
// A rota /usuarios é restrita ao ADMINISTRADOR (SecurityConfig e openapi.yaml). Para os outros
// perfis ela responde 403; nesse caso a tela usa o próprio usuário logado, se ele for pesquisador.
export async function listarPesquisadores(): Promise<Pesquisador[] | null> {
  try {
    const { data } = await api.get<Pagina<UsuarioResposta>>('/usuarios', {
      params: { perfil: 'PESQUISADOR', ativo: true, size: TAMANHO_PAGINA },
    })
    return data.content
      .filter((u) => u.perfil === 'PESQUISADOR' && u.ativo)
      .map((u) => ({ id: u.id, nome: u.nome }))
  } catch (erro) {
    if (isAxiosError(erro) && erro.response?.status === 403) return null
    throw traduzirErro(erro)
  }
}
