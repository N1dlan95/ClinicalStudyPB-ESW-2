import axios from 'axios'
import type { Estudo, EstudoEntrada, Pesquisador } from './tipos'

// ---------------------------------------------------------------------------
// Enquanto os endpoints da API não estão definidos, as telas rodam com dados
// fictícios (em memória). Quando a Eduarda definir a API, troque para false
// e ajuste as rotas/formatos marcados com TODO.
// ---------------------------------------------------------------------------
const USAR_DADOS_FICTICIOS = true

const CHAVE_SESSAO = 'clinicalstudypb.sessao' // mesma chave do AuthProvider

const urlDaApi = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  ?.VITE_API_URL

const api = axios.create({
  baseURL: urlDaApi ?? 'http://localhost:8080',
})

// Envia o token da sessão salva pelo AuthProvider
api.interceptors.request.use((config) => {
  try {
    const salva = localStorage.getItem(CHAVE_SESSAO)
    const token = salva ? (JSON.parse(salva) as { token?: string }).token : null
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {
    // sessão corrompida: segue sem token
  }
  return config
})

// ---------------------------------------------------------------------------
// Dados fictícios (espelham os exemplos do Figma)
// ---------------------------------------------------------------------------
const PESQUISADORES_FICTICIOS: Pesquisador[] = [
  { id: 'p1', nome: 'Dra. [Nome do pesquisador]' },
  { id: 'p2', nome: 'Dr. [Nome do pesquisador]' },
  { id: 'p3', nome: 'Pesquisadora Demo' },
]

let estudosFicticios: Estudo[] = [
  {
    id: '1',
    titulo: 'Estudo de exemplo A',
    codigoProtocolo: '[CÓDIGO-A]',
    descricao: '[Objetivo do estudo]',
    pesquisadorId: 'p1',
    pesquisadorNome: 'Dra. [Nome do pesquisador]',
    status: 'em_execucao',
    dataInicio: '2026-10-15',
    dataTermino: '2027-04-30',
    limiteParticipantes: 40,
    participantesIncluidos: 18,
    proximaVisita: '2026-10-28',
    pedidosRetirada: 0,
    ultimaAlteracaoEm: '2026-10-16',
    ultimaAlteracaoPor: 'Coordenação Demo',
  },
  {
    id: '2',
    titulo: 'Estudo de exemplo B',
    codigoProtocolo: '[CÓDIGO-B]',
    descricao: '',
    pesquisadorId: 'p2',
    pesquisadorNome: 'Dr. [Nome do pesquisador]',
    status: 'encerrado',
    dataInicio: '2026-01-05',
    dataTermino: '2026-06-30',
    limiteParticipantes: 25,
    participantesIncluidos: 25,
    proximaVisita: null,
    pedidosRetirada: 0,
    ultimaAlteracaoEm: null,
    ultimaAlteracaoPor: null,
  },
  {
    id: '3',
    titulo: 'Estudo de exemplo C',
    codigoProtocolo: '[CÓDIGO-C]',
    descricao: '',
    pesquisadorId: 'p3',
    pesquisadorNome: 'Pesquisadora Demo',
    status: 'planejado',
    dataInicio: '2027-12-01',
    dataTermino: '2028-03-31',
    limiteParticipantes: 30,
    participantesIncluidos: 0,
    proximaVisita: null,
    pedidosRetirada: 0,
    ultimaAlteracaoEm: null,
    ultimaAlteracaoPor: null,
  },
]

function esperar<T>(valor: T): Promise<T> {
  return new Promise((resolver) => setTimeout(() => resolver(valor), 200))
}

// ---------------------------------------------------------------------------
// Funções usadas pelas telas
// ---------------------------------------------------------------------------
export async function listarEstudos(): Promise<Estudo[]> {
  if (USAR_DADOS_FICTICIOS) return esperar([...estudosFicticios])
  const resposta = await api.get<Estudo[]>('/estudos') // TODO: confirmar rota e formato
  return resposta.data
}

export async function buscarEstudo(id: string): Promise<Estudo> {
  if (USAR_DADOS_FICTICIOS) {
    const estudo = estudosFicticios.find((e) => e.id === id)
    if (!estudo) throw new Error('Estudo não encontrado')
    return esperar({ ...estudo })
  }
  const resposta = await api.get<Estudo>(`/estudos/${id}`) // TODO
  return resposta.data
}

export async function listarPesquisadores(): Promise<Pesquisador[]> {
  if (USAR_DADOS_FICTICIOS) return esperar([...PESQUISADORES_FICTICIOS])
  // TODO: só usuários ativos com perfil Pesquisador
  const resposta = await api.get<Pesquisador[]>('/usuarios', {
    params: { perfil: 'PESQUISADOR', ativo: true },
  })
  return resposta.data
}

export async function criarEstudo(dados: EstudoEntrada): Promise<Estudo> {
  if (USAR_DADOS_FICTICIOS) {
    const pesquisador = PESQUISADORES_FICTICIOS.find((p) => p.id === dados.pesquisadorId)
    const novo: Estudo = {
      ...dados,
      id: String(Date.now()),
      pesquisadorNome: pesquisador?.nome ?? '',
      participantesIncluidos: 0,
      proximaVisita: null,
      pedidosRetirada: 0,
      ultimaAlteracaoEm: null,
      ultimaAlteracaoPor: null,
    }
    estudosFicticios = [...estudosFicticios, novo]
    return esperar(novo)
  }
  const resposta = await api.post<Estudo>('/estudos', dados) // TODO
  return resposta.data
}

export async function atualizarEstudo(id: string, dados: EstudoEntrada): Promise<Estudo> {
  if (USAR_DADOS_FICTICIOS) {
    const atual = estudosFicticios.find((e) => e.id === id)
    if (!atual) throw new Error('Estudo não encontrado')
    if (dados.limiteParticipantes < atual.participantesIncluidos) {
      throw new Error('Limite menor que os participantes incluídos')
    }
    const pesquisador = PESQUISADORES_FICTICIOS.find((p) => p.id === dados.pesquisadorId)
    const atualizado: Estudo = {
      ...atual,
      ...dados,
      pesquisadorNome: pesquisador?.nome ?? atual.pesquisadorNome,
      ultimaAlteracaoEm: new Date().toISOString().slice(0, 10),
      ultimaAlteracaoPor: 'Coordenação Demo',
    }
    estudosFicticios = estudosFicticios.map((e) => (e.id === id ? atualizado : e))
    return esperar(atualizado)
  }
  const resposta = await api.put<Estudo>(`/estudos/${id}`, dados) // TODO
  return resposta.data
}
