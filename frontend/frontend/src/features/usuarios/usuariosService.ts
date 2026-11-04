import { isAxiosError } from 'axios'
import type { Perfil } from '../auth/tipos'
import { api } from '../../services/api'
import type { UsuarioCadastrado, UsuarioEntrada } from './tipos'

// Formatos da API de usuários (backend AB#3218)
interface UsuarioResposta {
  id: number
  nome: string
  email: string
  matricula: string | null
  perfil: Perfil
  ativo: boolean
  criadoEm?: string | null
  ultimoAcesso?: string | null
}

interface Pagina<T> {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
}

// A tela filtra e conta localmente, então busca todos de uma vez (a API aceita até 100 por página)
const TAMANHO_PAGINA = 100

// Erro de e-mail repetido: a tela usa o id para o link "Ver usuário existente"
export class EmailDuplicadoError extends Error {
  readonly usuarioExistenteId: number | null

  constructor(usuarioExistenteId: number | null) {
    super('E-mail já cadastrado')
    this.usuarioExistenteId = usuarioExistenteId
  }
}

function paraUsuario(resposta: UsuarioResposta): UsuarioCadastrado {
  return {
    id: resposta.id,
    nome: resposta.nome,
    email: resposta.email,
    perfil: resposta.perfil,
    ativo: resposta.ativo,
    criadoEm: resposta.criadoEm ?? null,
    ultimoAcesso: resposta.ultimoAcesso ?? null,
  }
}

function codigoDoErro(erro: unknown): string | undefined {
  return isAxiosError(erro) ? (erro.response?.data as { codigo?: string } | undefined)?.codigo : undefined
}

// A API não diz quem já usa o e-mail: procura pela busca da listagem
async function idDoDonoDoEmail(email: string): Promise<number | null> {
  try {
    const { data } = await api.get<Pagina<UsuarioResposta>>('/usuarios', {
      params: { busca: email, size: TAMANHO_PAGINA },
    })
    const procurado = email.trim().toLowerCase()
    return data.content.find((u) => u.email.toLowerCase() === procurado)?.id ?? null
  } catch {
    return null
  }
}

async function tratarEmailDuplicado(erro: unknown, email: string): Promise<never> {
  if (codigoDoErro(erro) === 'EMAIL_DUPLICADO') throw new EmailDuplicadoError(await idDoDonoDoEmail(email))
  throw erro
}

async function alterarStatus(id: number, ativo: boolean): Promise<UsuarioCadastrado> {
  const { data } = await api.patch<UsuarioResposta>(`/usuarios/${id}/status`, { ativo })
  return paraUsuario(data)
}

// ---------------------------------------------------------------------------
// Funções usadas pelas telas
// ---------------------------------------------------------------------------
export async function listarUsuarios(): Promise<UsuarioCadastrado[]> {
  const { data } = await api.get<Pagina<UsuarioResposta>>('/usuarios', { params: { size: TAMANHO_PAGINA } })
  return data.content.map(paraUsuario)
}

export async function buscarUsuario(id: number): Promise<UsuarioCadastrado> {
  const { data } = await api.get<UsuarioResposta>(`/usuarios/${id}`)
  return paraUsuario(data)
}

export async function criarUsuario(dados: UsuarioEntrada): Promise<UsuarioCadastrado> {
  let criado: UsuarioCadastrado
  try {
    const { data } = await api.post<UsuarioResposta>('/usuarios', {
      nome: dados.nome,
      email: dados.email,
      perfil: dados.perfil,
      senha: dados.senha,
    })
    criado = paraUsuario(data)
  } catch (erro) {
    return tratarEmailDuplicado(erro, dados.email)
  }
  // A API sempre cria ativo; o status tem rota própria
  return dados.ativo ? criado : alterarStatus(criado.id, false)
}

export async function atualizarUsuario(id: number, dados: UsuarioEntrada): Promise<UsuarioCadastrado> {
  let atualizado: UsuarioCadastrado
  try {
    const { data } = await api.put<UsuarioResposta>(`/usuarios/${id}`, {
      nome: dados.nome,
      email: dados.email,
      perfil: dados.perfil,
    })
    atualizado = paraUsuario(data)
  } catch (erro) {
    return tratarEmailDuplicado(erro, dados.email)
  }
  // O PUT não muda a situação: só chama a rota de status se ela mudou
  return atualizado.ativo === dados.ativo ? atualizado : alterarStatus(id, dados.ativo)
}

// TODO: rota pendente no backend (combinado com a equipe). Até existir, a tela mostra o erro.
export async function enviarLinkRedefinicaoSenha(id: number): Promise<void> {
  await api.post(`/usuarios/${id}/redefinir-senha`)
}
