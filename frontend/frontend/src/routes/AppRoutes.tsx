import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '../features/auth/LoginPage'
import { ExigePermissao, RotaProtegida } from '../features/auth/RotaProtegida'
import { useAutorizacao } from '../features/auth/useAutorizacao'
import { EstudoFormPage } from '../features/estudos/EstudoFormPage'
import { EstudosListaPage } from '../features/estudos/EstudosListaPage'
import { UsuarioFormPage } from '../features/usuarios/UsuarioFormPage'
import { UsuariosListaPage } from '../features/usuarios/UsuariosListaPage'
import { LayoutPrincipal } from '../layout/LayoutPrincipal'

// Quem já está logado não precisa ver a tela de login de novo
function RotaLogin() {
  const { autenticado } = useAutorizacao()
  if (autenticado) return <Navigate to="/estudos" replace />
  return <LoginPage />
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
                <EstudosListaPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/novo"
            element={
              <ExigePermissao permissao="criarEstudos">
                <EstudoFormPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:id/editar"
            element={
              <ExigePermissao permissao="editarEstudos">
                <EstudoFormPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ExigePermissao permissao="gerenciarUsuarios">
                <UsuariosListaPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/usuarios/novo"
            element={
              <ExigePermissao permissao="gerenciarUsuarios">
                <UsuarioFormPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/usuarios/:id/editar"
            element={
              <ExigePermissao permissao="gerenciarUsuarios">
                <UsuarioFormPage />
              </ExigePermissao>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/estudos" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
