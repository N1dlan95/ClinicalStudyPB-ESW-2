import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import * as authService from './authService';
import { apagarSessao, carregarSessao, salvarSessao } from './sessionStorage';
import type { Credenciais, Sessao } from './types';

interface AuthContextValue {
  sessao: Sessao | null;
  carregando: boolean;
  entrar: (credenciais: Credenciais) => Promise<void>;
  sair: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarSessao()
      .then(setSessao)
      .catch(() => setSessao(null))
      .finally(() => setCarregando(false));
  }, []);

  const entrar = useCallback(async (credenciais: Credenciais) => {
    const nova = await authService.login(credenciais);
    await salvarSessao(nova);
    setSessao(nova);
  }, []);

  // RF02: encerramento de sessão.
  const sair = useCallback(async () => {
    await apagarSessao();
    setSessao(null);
  }, []);

  const value = useMemo(() => ({ sessao, carregando, entrar, sair }), [sessao, carregando, entrar, sair]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de <AuthProvider>.');
  }
  return ctx;
}
