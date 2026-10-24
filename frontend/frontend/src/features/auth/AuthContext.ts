import { createContext } from 'react'
import type { Sessao, Usuario } from './tipos'

export type AuthContextValor = {
  usuario: Usuario | null
  token: string | null
  autenticado: boolean
  entrar: (sessao: Sessao) => void
  sair: () => void
}

export const AuthContext = createContext<AuthContextValor | null>(null)
