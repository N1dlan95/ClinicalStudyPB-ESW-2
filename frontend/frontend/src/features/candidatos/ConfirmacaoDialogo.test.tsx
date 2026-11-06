import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmacaoDialogo } from './ConfirmacaoDialogo'

function renderizar(props: Partial<Parameters<typeof ConfirmacaoDialogo>[0]> = {}) {
  const aoConfirmar = vi.fn()
  const aoCancelar = vi.fn()
  render(
    <ConfirmacaoDialogo
      titulo="Incluir no estudo?"
      rotuloConfirmar="Confirmar inclusão"
      aoConfirmar={aoConfirmar}
      aoCancelar={aoCancelar}
      {...props}
    >
      <p>Texto do diálogo</p>
    </ConfirmacaoDialogo>,
  )
  return { aoConfirmar, aoCancelar }
}

describe('ConfirmacaoDialogo', () => {
  it('abre como diálogo modal com o foco em Cancelar', () => {
    renderizar()

    const dialogo = screen.getByRole('dialog', { name: 'Incluir no estudo?' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo).toHaveTextContent('Texto do diálogo')
    expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus()
  })

  it('confirma e cancela pelos botões', async () => {
    const { aoConfirmar, aoCancelar } = renderizar()

    await userEvent.click(screen.getByRole('button', { name: 'Confirmar inclusão' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(aoConfirmar).toHaveBeenCalledTimes(1)
    expect(aoCancelar).toHaveBeenCalledTimes(1)
  })

  it('fecha com a tecla Esc', async () => {
    const { aoCancelar } = renderizar()

    await userEvent.keyboard('{Escape}')

    expect(aoCancelar).toHaveBeenCalledTimes(1)
  })

  it('desabilita a confirmação enquanto salva', () => {
    renderizar({ confirmando: true, rotuloConfirmando: 'Incluindo…' })

    expect(screen.getByRole('button', { name: 'Incluindo…' })).toBeDisabled()
  })
})
