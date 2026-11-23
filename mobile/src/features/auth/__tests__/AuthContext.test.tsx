import { act, render, screen, userEvent } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { AuthProvider, useAuth } from '../AuthContext';
import * as authService from '../authService';
import { notificarSessaoExpirada } from '../sessaoExpirada';
import * as sessionStorage from '../sessionStorage';
import type { Sessao } from '../types';

jest.mock('../authService', () => ({
  ...jest.requireActual('../authService'),
  login: jest.fn(),
  logout: jest.fn(),
}));
jest.mock('../sessionStorage', () => ({
  carregarSessao: jest.fn(),
  salvarSessao: jest.fn(),
  apagarSessao: jest.fn(),
}));

const login = authService.login as jest.Mock;
const logout = authService.logout as jest.Mock;
const carregarSessao = sessionStorage.carregarSessao as jest.Mock;
const salvarSessao = sessionStorage.salvarSessao as jest.Mock;
const apagarSessao = sessionStorage.apagarSessao as jest.Mock;

const sessao: Sessao = {
  token: 'jwt-123',
  expiraEm: '2999-01-01T00:00:00Z',
  usuario: { id: 4, nome: 'Paula Participante', email: 'participante@clinicalstudypb.test', perfil: 'PARTICIPANTE' },
};

// Mostra o estado do contexto e expõe as ações como botões
function Painel() {
  const { sessao: atual, carregando, aviso, entrar, sair } = useAuth();
  if (carregando) return <Text>carregando</Text>;
  return (
    <>
      <Text>{atual ? `logado:${atual.usuario.nome}` : 'deslogado'}</Text>
      {aviso && <Text>{aviso}</Text>}
      <Pressable accessibilityRole="button" onPress={() => entrar({ email: 'p@teste.com', senha: 'Senha@123' })}>
        <Text>Entrar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => sair()}>
        <Text>Sair</Text>
      </Pressable>
    </>
  );
}

async function renderizar() {
  await render(
    <AuthProvider>
      <Painel />
    </AuthProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  carregarSessao.mockResolvedValue(null);
  salvarSessao.mockResolvedValue(undefined);
  apagarSessao.mockResolvedValue(undefined);
  logout.mockResolvedValue(undefined);
});

describe('<AuthProvider />', () => {
  it('restaura a sessão salva ainda válida', async () => {
    carregarSessao.mockResolvedValue(sessao);
    await renderizar();

    expect(await screen.findByText('logado:Paula Participante')).toBeOnTheScreen();
  });

  it('descarta a sessão salva com token vencido e avisa no login', async () => {
    carregarSessao.mockResolvedValue({ ...sessao, expiraEm: '2000-01-01T00:00:00Z' });
    await renderizar();

    expect(await screen.findByText('deslogado')).toBeOnTheScreen();
    expect(screen.getByText('Sua sessão expirou. Entre novamente.')).toBeOnTheScreen();
    expect(apagarSessao).toHaveBeenCalled();
  });

  it('entrar salva a sessão', async () => {
    login.mockResolvedValue(sessao);
    const user = userEvent.setup();
    await renderizar();

    await user.press(await screen.findByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('logado:Paula Participante')).toBeOnTheScreen();
    expect(salvarSessao).toHaveBeenCalledWith(sessao);
  });

  it('sair chama o logout da API com o token e limpa a sessão (RF02)', async () => {
    carregarSessao.mockResolvedValue(sessao);
    const user = userEvent.setup();
    await renderizar();

    await user.press(await screen.findByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('deslogado')).toBeOnTheScreen();
    expect(logout).toHaveBeenCalledWith('jwt-123');
    expect(apagarSessao).toHaveBeenCalled();
  });

  it('sair limpa a sessão mesmo se o logout da API falhar', async () => {
    carregarSessao.mockResolvedValue(sessao);
    logout.mockRejectedValue(new Error('falhou'));
    const user = userEvent.setup();
    await renderizar();

    await user.press(await screen.findByRole('button', { name: 'Sair' }));

    expect(await screen.findByText('deslogado')).toBeOnTheScreen();
    expect(apagarSessao).toHaveBeenCalled();
  });

  it('401 em qualquer chamada encerra a sessão com o aviso', async () => {
    carregarSessao.mockResolvedValue(sessao);
    await renderizar();
    await screen.findByText('logado:Paula Participante');

    await act(async () => {
      notificarSessaoExpirada();
    });

    expect(await screen.findByText('deslogado')).toBeOnTheScreen();
    expect(screen.getByText('Sua sessão expirou. Entre novamente.')).toBeOnTheScreen();
    expect(apagarSessao).toHaveBeenCalled();
  });

  it('entrar de novo apaga o aviso de sessão expirada', async () => {
    carregarSessao.mockResolvedValue({ ...sessao, expiraEm: '2000-01-01T00:00:00Z' });
    login.mockResolvedValue(sessao);
    const user = userEvent.setup();
    await renderizar();
    await screen.findByText('Sua sessão expirou. Entre novamente.');

    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByText('logado:Paula Participante')).toBeOnTheScreen();
    expect(screen.queryByText('Sua sessão expirou. Entre novamente.')).not.toBeOnTheScreen();
  });
});
