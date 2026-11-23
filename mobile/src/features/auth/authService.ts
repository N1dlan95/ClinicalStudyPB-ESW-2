import { API_URL, USE_MOCK_API } from '../../config/env';
import type { Credenciais, Perfil, Sessao } from './types';

/** Erro de autenticação com mensagem pronta para exibir ao usuário. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Contrato da API (openapi.yaml, tag Autenticação):
 *   POST /api/auth/login   body { email, senha }
 *     200 -> { token, tipo, expiraEm, usuario: { id, nome, email, perfil, ... } }
 *     401 -> { codigo: CREDENCIAIS_INVALIDAS | USUARIO_INATIVO, mensagem }
 *   POST /api/auth/logout  Authorization: Bearer <token>  -> 204
 */
const LOGIN_PATH = '/api/auth/login';
const LOGOUT_PATH = '/api/auth/logout';

// O logout não pode deixar o usuário preso se o servidor não responder
const TEMPO_LIMITE_LOGOUT_MS = 5000;

interface LoginResponse {
  token: string;
  expiraEm?: string;
  usuario: { id: number; nome: string; email: string; perfil: Perfil };
}

interface ErroApi {
  codigo?: string;
  mensagem?: string;
}

export async function login(credenciais: Credenciais): Promise<Sessao> {
  const sessao = USE_MOCK_API ? await loginMock(credenciais) : await loginApi(credenciais);

  // RF03: o aplicativo mobile atende somente o perfil participante.
  if (sessao.usuario.perfil !== 'PARTICIPANTE') {
    throw new AuthError('Este aplicativo é exclusivo para participantes. Use o sistema web.');
  }
  return sessao;
}

/**
 * RF02: encerra a sessão no servidor (o token deixa de valer). Nunca lança erro: quem chama
 * apaga a sessão local de qualquer jeito, mesmo sem conexão ou com o token já vencido.
 */
export async function logout(token: string): Promise<void> {
  if (USE_MOCK_API) return;
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), TEMPO_LIMITE_LOGOUT_MS);
  try {
    await fetch(`${API_URL}${LOGOUT_PATH}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      signal: controle.signal,
    });
  } catch {
    // Sem conexão ou tempo esgotado: o token expira sozinho no servidor
  } finally {
    clearTimeout(limite);
  }
}

async function loginApi(credenciais: Credenciais): Promise<Sessao> {
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${LOGIN_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: credenciais.email.trim(), senha: credenciais.senha }),
    });
  } catch {
    throw new AuthError('Não foi possível conectar ao servidor. Verifique sua conexão.');
  }

  if (resposta.status === 401) {
    const erro = await lerErro(resposta);
    // Usuário desativado tem mensagem própria; credencial errada mantém o texto padrão
    throw new AuthError(
      erro.codigo === 'USUARIO_INATIVO' && erro.mensagem ? erro.mensagem : 'E-mail ou senha incorretos.',
    );
  }
  if (resposta.status === 400) {
    throw new AuthError('Verifique o e-mail e a senha informados.');
  }
  if (!resposta.ok) {
    throw new AuthError('Erro no servidor. Tente novamente mais tarde.');
  }

  const corpo = (await resposta.json()) as LoginResponse;
  const { id, nome, email, perfil } = corpo.usuario;
  return { token: corpo.token, expiraEm: corpo.expiraEm, usuario: { id, nome, email, perfil } };
}

async function lerErro(resposta: Response): Promise<ErroApi> {
  try {
    return (await resposta.json()) as ErroApi;
  } catch {
    return {};
  }
}

/** Usuários fictícios para o modo simulado (EXPO_PUBLIC_USE_MOCK=true). */
const USUARIOS_MOCK: Record<string, Sessao['usuario'] & { senha: string }> = {
  'participante@clinicalstudy.pb': {
    id: 1,
    nome: 'Participante Demo',
    email: 'participante@clinicalstudy.pb',
    perfil: 'PARTICIPANTE',
    senha: 'senha123',
  },
  'pesquisador@clinicalstudy.pb': {
    id: 2,
    nome: 'Pesquisador Demo',
    email: 'pesquisador@clinicalstudy.pb',
    perfil: 'PESQUISADOR',
    senha: 'senha123',
  },
};

async function loginMock({ email, senha }: Credenciais): Promise<Sessao> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const registro = USUARIOS_MOCK[email.trim().toLowerCase()];
  if (!registro || registro.senha !== senha) {
    throw new AuthError('E-mail ou senha incorretos.');
  }
  const { senha: _senha, ...usuario } = registro;
  return { token: `mock-token-${usuario.id}`, usuario };
}
