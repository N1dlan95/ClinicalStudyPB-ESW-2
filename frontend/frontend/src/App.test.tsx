import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'
import { AuthProvider } from './features/auth/AuthProvider'

describe('App', () => {
  it('sem sessão, abre na tela de login', async () => {
    render(
      <AuthProvider>
        <App />
      </AuthProvider>,
    )
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument()
  })
})
