import { AuthError, login } from '../authService';

// Sem EXPO_PUBLIC_API_URL definida, o serviço usa o modo simulado (mock).
describe('authService.login (modo mock)', () => {
  it('autentica o participante de demonstração', async () => {
    const sessao = await login({ email: 'participante@clinicalstudy.pb', senha: 'senha123' });
    expect(sessao.usuario.perfil).toBe('PARTICIPANTE');
    expect(sessao.token).toBeTruthy();
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
});
