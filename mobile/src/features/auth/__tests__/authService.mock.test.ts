import { AuthError, login, logout } from '../authService';

// Modo simulado (EXPO_PUBLIC_USE_MOCK=true): não chama a API
jest.mock('../../../config/env', () => ({ API_URL: 'http://api.teste', USE_MOCK_API: true }));

describe('authService (modo simulado)', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  it('autentica o participante de demonstração', async () => {
    const sessao = await login({ email: 'participante@clinicalstudy.pb', senha: 'senha123' });
    expect(sessao.usuario.perfil).toBe('PARTICIPANTE');
    expect(sessao.token).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejeita senha incorreta', async () => {
    await expect(login({ email: 'participante@clinicalstudy.pb', senha: 'x' })).rejects.toThrow(
      'E-mail ou senha incorretos.',
    );
  });

  it('bloqueia perfis que não são participante (RF03)', async () => {
    const tentativa = login({ email: 'pesquisador@clinicalstudy.pb', senha: 'senha123' });
    await expect(tentativa).rejects.toBeInstanceOf(AuthError);
    await expect(tentativa).rejects.toThrow(/exclusivo para participantes/);
  });

  it('logout não chama a API', async () => {
    await logout('mock-token-1');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
