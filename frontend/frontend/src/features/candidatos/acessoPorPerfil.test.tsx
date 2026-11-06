import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '../auth/AuthContext'
import { ExigePermissao } from '../auth/RotaProtegida'
import type { Perfil } from '../auth/tipos'

// As telas de candidatos ficam atrás de ExigePermissao "gerenciarCandidatos" (AppRoutes).
// No backend, /estudos/*/candidatos e /candidatos/** são só do COORDENADOR (SecurityConfig).
function renderizarComo(perfil: Perfil) {
  render(
    <AuthContext.Provider
      value={{
        usuario: { id: 1, nome: 'Usuário', email: 'u@clinicalstudypb.test', perfil },
        token: 't',
        autenticado: true,
        entrar: () => {},
        sair: () => {},
      }}
    >
      <MemoryRouter>
        <ExigePermissao permissao="gerenciarCandidatos">
          <p>Tela de candidatos</p>
        </ExigePermissao>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('acesso às telas de candidatos por perfil', () => {
  it('libera para o coordenador', () => {
    renderizarComo('COORDENADOR')
    expect(screen.getByText('Tela de candidatos')).toBeInTheDocument()
  })

  it.each<Perfil>(['PESQUISADOR', 'ADMINISTRADOR', 'PARTICIPANTE'])('bloqueia o perfil %s com acesso negado', (perfil) => {
    renderizarComo(perfil)
    expect(screen.queryByText('Tela de candidatos')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Acesso negado' })).toBeInTheDocument()
  })
})
