import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AcessoNegadoPage } from './AcessoNegadoPage'
import type { Permissao } from './permissoes'
import { useAutorizacao } from './useAutorizacao'

// Exige login. Quem não está autenticado vai para /login.
export function RotaProtegida({ children }: { children: ReactNode }) {
  const { autenticado } = useAutorizacao()
  const local = useLocation()

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ de: local.pathname }} />
  }
  return <>{children}</>
}

// Exige uma permissão específica. Sem ela, mostra a tela de acesso negado (403).
export function ExigePermissao({
  permissao,
  children,
}: {
  permissao: Permissao
  children: ReactNode
}) {
  const { pode } = useAutorizacao()

  if (!pode(permissao)) {
    return <AcessoNegadoPage permissao={permissao} />
  }
  return <>{children}</>
}
