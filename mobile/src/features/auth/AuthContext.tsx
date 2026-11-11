import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as authService from './authService';
import { MENSAGEM_SESSAO_EXPIRADA, aoExpirarSessao } from './sessaoExpirada';
import { apagarSessao, carregarSessao, salvarSessao } from './sessionStorage';
import type { Credenciais, Sessao } from './types';

interface AuthContextValue {
  sessao: Sessao | null;
  carregando: boolean;
  /** Mensagem para a tela de login, como "Sua sessão expirou. Entre novamente." */
  aviso: string | null;
  entrar: (credenciais: Credenciais) => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function expirou(sessao: Sessao): boolean {
  return !!sessao.expiraEm && new Date(sessao.expiraEm).getTime() <= Date.now();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const sessaoAtual = useRef<Sessao | null>(null);

  const atualizarSessao = useCallback((nova: Sessao | null) => {
    sessaoAtual.current = nova;
    setSessao(nova);
  }, []);

  const encerrarPorExpiracao = useCallback(async () => {
    atualizarSessao(null);
    setAviso(MENSAGEM_SESSAO_EXPIRADA);
    await apagarSessao().catch(() => undefined);
  }, [atualizarSessao]);

  // Sessão salva com token já vencido não chega a abrir as telas
  useEffect(() => {
    carregarSessao()
      .then((salva) => {
        if (salva && expirou(salva)) {
          return encerrarPorExpiracao();
        }
        atualizarSessao(salva);
      })
      .catch(() => atualizarSessao(null))
      .finally(() => setCarregando(false));
  }, [atualizarSessao, encerrarPorExpiracao]);

  // Qualquer chamada que receba 401 da API encerra a sessão e volta ao login
  useEffect(
    () =>
      aoExpirarSessao(() => {
        if (sessaoAtual.current) encerrarPorExpiracao();
      }),
    [encerrarPorExpiracao],
  );

  const entrar = useCallback(
    async (credenciais: Credenciais) => {
      const nova = await authService.login(credenciais);
      await salvarSessao(nova);
      setAviso(null);
      atualizarSessao(nova);
    },
    [atualizarSessao],
  );

  // RF02: encerramento de sessão. Avisa a API e limpa a sessão local mesmo se a chamada falhar.
  const sair = useCallback(async () => {
    const token = sessaoAtual.current?.token;
    if (token) await authService.logout(token).catch(() => undefined);
    await apagarSessao().catch(() => undefined);
    setAviso(null);
    atualizarSessao(null);
  }, [atualizarSessao]);

  const value = useMemo(
    () => ({ sessao, carregando, aviso, entrar, sair }),
    [sessao, carregando, aviso, entrar, sair],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return ctx;
}
