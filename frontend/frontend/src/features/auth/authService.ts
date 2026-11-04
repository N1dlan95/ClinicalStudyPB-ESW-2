import { isAxiosError } from 'axios'
import { api } from '../../services/api'
import type { Perfil, Sessao } from './tipos'

// Resposta de POST /auth/login (backend AB#3218)
interface LoginResposta {
  token: string
  tipo: string
  expiraEm: string
  usuario: {
    id: number
    nome: string
    email: string
    matricula: string | null
    perfil: Perfil
    ativo: boolean
    permissoes: string[]
  }
}

// Mensagens do Figma 3108 (Login – senha inválida / outras mensagens previstas)
export const MENSAGEM_LOGIN = {
  credenciais: 'E-mail ou senha incorretos. Confira os dados e tente novamente.',
  inativo: 'Seu acesso está desativado. Fale com um administrador.',
  participante: 'O painel web é exclusivo para a equipe do estudo. Use o aplicativo.',
  semConexao: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
  inesperado: 'Não foi possível entrar. Tente novamente.',
}

// Erro de login já traduzido para a tela. senhaInvalida destaca o campo de senha.
export class ErroLogin extends Error {
  readonly senhaInvalida: boolean

  constructor(mensagem: string, senhaInvalida = false) {
    super(mensagem)
    this.senhaInvalida = senhaInvalida
  }
}

function traduzirErro(erro: unknown): ErroLogin {
  if (!isAxiosError(erro)) return new ErroLogin(MENSAGEM_LOGIN.inesperado)
  if (!erro.response) return new ErroLogin(MENSAGEM_LOGIN.semConexao)

  const codigo = (erro.response.data as { codigo?: string } | undefined)?.codigo
  if (codigo === 'CREDENCIAIS_INVALIDAS') return new ErroLogin(MENSAGEM_LOGIN.credenciais, true)
  if (codigo === 'USUARIO_INATIVO') return new ErroLogin(MENSAGEM_LOGIN.inativo)
  return new ErroLogin(MENSAGEM_LOGIN.inesperado)
}

export async function entrarNaApi(email: string, senha: string): Promise<Sessao> {
  let resposta: LoginResposta
  try {
    resposta = (await api.post<LoginResposta>('/auth/login', { email: email.trim(), senha })).data
  } catch (erro) {
    throw traduzirErro(erro)
  }

  const { usuario, token } = resposta
  // Participante usa só o aplicativo: encerra o token que acabou de ser criado
  if (usuario.perfil === 'PARTICIPANTE') {
    await sairDaApi(token)
    throw new ErroLogin(MENSAGEM_LOGIN.participante)
  }

  return {
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil },
  }
}

// Invalida o token no backend. Falhas são ignoradas: a sessão local é apagada de qualquer forma.
export async function sairDaApi(token: string): Promise<void> {
  try {
    await api.post('/auth/logout', null, { headers: { Authorization: `Bearer ${token}` } })
  } catch {
    // token já expirado ou servidor fora do ar: nada a fazer
  }
}
