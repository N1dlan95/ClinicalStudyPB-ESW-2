import { AuthError, login, logout } from '../authService';

// Modo API real, com o fetch simulado
jest.mock('../../../config/env', () => ({ API_URL: 'http://api.teste', USE_MOCK_API: false }));

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function resposta(status: number, corpo?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      if (corpo === undefined) throw new Error('sem corpo');
      return corpo;
    },
  } as unknown as Response;
}

const credenciais = { email: ' participante@clinicalstudypb.test ', senha: 'Senha@123' };

const loginOk = {
  token: 'jwt-123',
  tipo: 'Bearer',
  expiraEm: '2026-11-10T22:00:00Z',
  usuario: {
    id: 4,
    nome: 'Paula Participante',
    email: 'participante@clinicalstudypb.test',
    matricula: null,
    perfil: 'PARTICIPANTE',
    ativo: true,
    permissoes: [],
  },
};

beforeEach(() => fetchMock.mockReset());

describe('authService.login (API real)', () => {
  it('envia e-mail e senha no contrato do OpenAPI e monta a sessão', async () => {
    fetchMock.mockResolvedValue(resposta(200, loginOk));

    const sessao = await login(credenciais);

    expect(fetchMock).toHaveBeenCalledWith('http://api.teste/api/auth/login', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ email: 'participante@clinicalstudypb.test', senha: 'Senha@123' }),
    }));
    expect(sessao).toEqual({
      token: 'jwt-123',
      expiraEm: '2026-11-10T22:00:00Z',
      usuario: { id: 4, nome: 'Paula Participante', email: 'participante@clinicalstudypb.test', perfil: 'PARTICIPANTE' },
    });
  });

  it('bloqueia perfis que não são participante com a mensagem atual (RF03)', async () => {
    fetchMock.mockResolvedValue(resposta(200, { ...loginOk, usuario: { ...loginOk.usuario, perfil: 'COORDENADOR' } }));

    const tentativa = login(credenciais);
    await expect(tentativa).rejects.toBeInstanceOf(AuthError);
    await expect(tentativa).rejects.toThrow('Este aplicativo é exclusivo para participantes. Use o sistema web.');
  });

  it('credenciais erradas mostram a mensagem padrão', async () => {
    fetchMock.mockResolvedValue(resposta(401, { codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'E-mail ou senha incorretos' }));

    await expect(login(credenciais)).rejects.toThrow('E-mail ou senha incorretos.');
  });

  it('usuário desativado mostra a mensagem da API', async () => {
    fetchMock.mockResolvedValue(
      resposta(401, { codigo: 'USUARIO_INATIVO', mensagem: 'Usuário desativado. Procure o administrador' }),
    );

    await expect(login(credenciais)).rejects.toThrow('Usuário desativado. Procure o administrador');
  });

  it('401 sem corpo continua com a mensagem padrão', async () => {
    fetchMock.mockResolvedValue(resposta(401));

    await expect(login(credenciais)).rejects.toThrow('E-mail ou senha incorretos.');
  });

  it('dados recusados pela validação da API (400)', async () => {
    fetchMock.mockResolvedValue(resposta(400, { codigo: 'VALIDACAO' }));

    await expect(login(credenciais)).rejects.toThrow('Verifique o e-mail e a senha informados.');
  });

  it('erro do servidor (500)', async () => {
    fetchMock.mockResolvedValue(resposta(500));

    await expect(login(credenciais)).rejects.toThrow('Erro no servidor. Tente novamente mais tarde.');
  });

  it('sem conexão', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(login(credenciais)).rejects.toThrow('Não foi possível conectar ao servidor. Verifique sua conexão.');
  });
});

describe('authService.logout (API real)', () => {
  it('chama o logout da API com o token', async () => {
    fetchMock.mockResolvedValue(resposta(204));

    await logout('jwt-123');

    expect(fetchMock).toHaveBeenCalledWith('http://api.teste/api/auth/logout', expect.objectContaining({
      method: 'POST',
      headers: { Authorization: 'Bearer jwt-123' },
    }));
  });

  it('não lança erro quando a chamada falha', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await expect(logout('jwt-123')).resolves.toBeUndefined();
  });

  it('não lança erro quando o token já venceu (401)', async () => {
    fetchMock.mockResolvedValue(resposta(401));

    await expect(logout('jwt-vencido')).resolves.toBeUndefined();
  });
});
