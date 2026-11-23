import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AcoesVisitaPage } from '../features/agenda/AcoesVisitaPage'
import { AgendaEstudoPage } from '../features/agenda/AgendaEstudoPage'
import { AgendamentoVisitaFormPage } from '../features/agenda/AgendamentoVisitaFormPage'
import { LoginPage } from '../features/auth/LoginPage'
import { ExigePermissao, RotaProtegida } from '../features/auth/RotaProtegida'
import { useAutorizacao } from '../features/auth/useAutorizacao'
import { AvaliacaoElegibilidadePage } from '../features/candidatos/AvaliacaoElegibilidadePage'
import { CandidatoDetalhePage } from '../features/candidatos/CandidatoDetalhePage'
import { CandidatoFormPage } from '../features/candidatos/CandidatoFormPage'
import { CandidatosListaPage } from '../features/candidatos/CandidatosListaPage'
import { CriteriosPage } from '../features/estudos/CriteriosPage'
import { EstadoEstudoPage } from '../features/estudos/EstadoEstudoPage'
import { EstudoFormPage } from '../features/estudos/EstudoFormPage'
import { EstudosListaPage } from '../features/estudos/EstudosListaPage'
import { VisitasPrevistasPage } from '../features/estudos/VisitasPrevistasPage'
import { ResultadosVisitaPage } from '../features/visitas/ResultadosVisitaPage'
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
            path="/estudos/:id/criterios"
            element={
              <ExigePermissao permissao="verEstudos">
                <CriteriosPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:id/visitas-previstas"
            element={
              <ExigePermissao permissao="editarEstudos">
                <VisitasPrevistasPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:id/estado"
            element={
              <ExigePermissao permissao="editarEstudos">
                <EstadoEstudoPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:id/agenda"
            element={
              <ExigePermissao permissao="verEstudos">
                <AgendaEstudoPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:id/agenda/novo"
            element={
              // Agendar é só do coordenador (a API recusa os outros perfis com 403)
              <ExigePermissao permissao="gerenciarVisitas">
                <AgendamentoVisitaFormPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:id/agenda/:visitaId/acoes"
            element={
              <ExigePermissao permissao="gerenciarVisitas">
                <AcoesVisitaPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:estudoId/candidatos"
            element={
              <ExigePermissao permissao="gerenciarCandidatos">
                <CandidatosListaPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:estudoId/candidatos/novo"
            element={
              <ExigePermissao permissao="gerenciarCandidatos">
                <CandidatoFormPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:estudoId/candidatos/:id"
            element={
              <ExigePermissao permissao="gerenciarCandidatos">
                <CandidatoDetalhePage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:estudoId/candidatos/:id/avaliacao"
            element={
              <ExigePermissao permissao="gerenciarCandidatos">
                <AvaliacaoElegibilidadePage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:estudoId/candidatos/:id/editar"
            element={
              <ExigePermissao permissao="gerenciarCandidatos">
                <CandidatoFormPage />
              </ExigePermissao>
            }
          />
          <Route
            path="/estudos/:estudoId/visitas/:visitaId/resultados"
            element={
              <ExigePermissao permissao="verResultados">
                <ResultadosVisitaPage />
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
