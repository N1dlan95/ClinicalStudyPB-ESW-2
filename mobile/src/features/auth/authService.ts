import { API_URL, USE_MOCK_API } from '../../config/env';
import type { Credenciais, Sessao } from './types';

/** Erro de autenticação com mensagem pronta para exibir ao usuário. */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

/**
 * Contrato PROVISÓRIO até o backend publicar o OpenAPI (tasks T-06/T-23):
 *   POST {API_URL}/api/auth/login   body: { email, senha }
 *   200 -> { token, usuario: { id, nome, email, perfil } }
 *   401 -> credenciais inválidas
 * Ao fechar o contrato, ajuste apenas este arquivo.
 */
const LOGIN_PATH = '/api/auth/login';

export async function login(credenciais: Credenciais): Promise<Sessao> {
  const sessao = USE_MOCK_API ? await loginMock(credenciais) : await loginApi(credenciais);

  // RF03: o aplicativo mobile atende somente o perfil participante.
  if (sessao.usuario.perfil !== 'PARTICIPANTE') {
    throw new AuthError('Este aplicativo é exclusivo para participantes. Use o sistema web.');
  }
  return sessao;
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

  if (resposta.status === 401 || resposta.status === 403) {
    throw new AuthError('E-mail ou senha incorretos.');
  }
  if (!resposta.ok) {
    throw new AuthError('Erro no servidor. Tente novamente mais tarde.');
  }
  return (await resposta.json()) as Sessao;
}

/** Usuários fictícios para desenvolvimento sem backend. */
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
