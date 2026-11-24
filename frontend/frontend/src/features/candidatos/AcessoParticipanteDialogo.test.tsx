import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AcessoParticipanteDialogo } from './AcessoParticipanteDialogo'

function renderizar(aoFechar = vi.fn()) {
  render(<AcessoParticipanteDialogo nome="Ana Ribeiro" email="ana@exemplo.test" senha="Kx7#pQ2m" aoFechar={aoFechar} />)
  return aoFechar
}

describe('AcessoParticipanteDialogo (T-86)', () => {
  it('fecha pelo botão e pela tecla Esc', async () => {
    const aoFechar = renderizar()
    await userEvent.click(screen.getByRole('button', { name: 'Fechar' }))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(aoFechar).toHaveBeenCalledTimes(2)
  })

  it('avisa quando não consegue copiar', async () => {
    const usuario = userEvent.setup()
    renderizar()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('bloqueado'))

    await usuario.click(screen.getByRole('button', { name: 'Copiar' }))

    expect(await screen.findByText('Não foi possível copiar. Anote a senha antes de fechar.')).toBeInTheDocument()
  })
})
