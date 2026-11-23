import { render, screen, userEvent } from '@testing-library/react-native';
import { login } from '../authService';
import { LoginForm } from '../LoginForm';
import type { Sessao } from '../types';

// Task 3783: tela de login com o authService de verdade e a API simulada (fetch mockado)
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

function loginOk(perfil: string) {
  return resposta(200, {
    token: 'jwt-123',
    tipo: 'Bearer',
    expiraEm: '2026-11-23T22:00:00Z',
    usuario: { id: 4, nome: 'Paula Participante', email: 'participante@clinicalstudypb.test', perfil },
  });
}

async function entrar(onSucesso: (sessao: Sessao) => void = jest.fn()) {
  const user = userEvent.setup();
  await render(<LoginForm onSubmit={async (credenciais) => onSucesso(await login(credenciais))} />);
  await user.type(screen.getByLabelText('E-mail'), 'participante@clinicalstudypb.test');
  await user.type(screen.getByLabelText('Senha'), 'Senha@123');
  await user.press(screen.getByRole('button', { name: 'Entrar' }));
}

beforeEach(() => fetchMock.mockReset());

describe('Login com a API (componente)', () => {
  it('entra com o participante e devolve a sessão', async () => {
    fetchMock.mockResolvedValue(loginOk('PARTICIPANTE'));
    const onSucesso = jest.fn();

    await entrar(onSucesso);

    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeOnTheScreen();
    expect(onSucesso).toHaveBeenCalledWith(expect.objectContaining({
      token: 'jwt-123',
      usuario: expect.objectContaining({ perfil: 'PARTICIPANTE' }),
    }));
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  it('mostra o erro de credenciais inválidas', async () => {
    fetchMock.mockResolvedValue(resposta(401, { codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'E-mail ou senha incorretos' }));

    await entrar();

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });

  it('bloqueia o perfil que não é participante', async () => {
    fetchMock.mockResolvedValue(loginOk('COORDENADOR'));
    const onSucesso = jest.fn();

    await entrar(onSucesso);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este aplicativo é exclusivo para participantes. Use o sistema web.',
    );
    expect(onSucesso).not.toHaveBeenCalled();
  });

  it('mostra o erro de rede', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));

    await entrar();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar ao servidor. Verifique sua conexão.',
    );
  });
});
