import { useState, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import { sairDaApi } from './authService'
import type { Sessao } from './tipos'

const CHAVE_SESSAO = 'clinicalstudypb.sessao'

// Recupera a sessão salva para o usuário continuar logado ao recarregar a página
function lerSessaoSalva(): Sessao | null {
  try {
    const salva = localStorage.getItem(CHAVE_SESSAO)
    return salva ? (JSON.parse(salva) as Sessao) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Sessao | null>(lerSessaoSalva)

  function entrar(novaSessao: Sessao) {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(novaSessao))
    setSessao(novaSessao)
  }

  function sair() {
    // Avisa o backend em segundo plano; a tela não espera a resposta
    if (sessao) void sairDaApi(sessao.token)
    localStorage.removeItem(CHAVE_SESSAO)
    setSessao(null)
  }

  return (
    <AuthContext.Provider
      value={{
        usuario: sessao?.usuario ?? null,
        token: sessao?.token ?? null,
        autenticado: sessao !== null,
        entrar,
        sair,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
