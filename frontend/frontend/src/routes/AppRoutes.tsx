import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { ExigePermissao, RotaProtegida } from '../features/auth/RotaProtegida'
import { useAutorizacao } from '../features/auth/useAutorizacao'
import { UsuariosPage } from '../features/usuarios/UsuariosPage'
import { LayoutPrincipal } from '../layout/LayoutPrincipal'

// Quem já está logado não precisa ver a tela de login de novo
function RotaLogin() {
  const { autenticado } = useAutorizacao()
  if (autenticado) return <Navigate to="/estudos" replace />
  return <LoginPage />
}

// Provisório: as telas de estudos entram na task 3237
function EstudosEmConstrucao() {
  return (
    <div className="pagina">
      <h1>Estudos</h1>
    </div>
  )
}

export function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<RotaLogin />} />

        <Route
          element={
            <RotaProtegida>
              <LayoutPrincipal />
            </RotaProtegida>
          }
        >
          <Route
            path="/estudos"
            element={
              <ExigePermissao permissao="verEstudos">
                <EstudosEmConstrucao />
              </ExigePermissao>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ExigePermissao permissao="gerenciarUsuarios">
                <UsuariosPage />
              </ExigePermissao>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/estudos" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
