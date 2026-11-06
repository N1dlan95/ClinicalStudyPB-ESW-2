import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ContadorVagas } from './ContadorVagas'

describe('ContadorVagas', () => {
  it('mostra vagas ocupadas, livres e a barra de progresso', () => {
    render(<ContadorVagas ocupadas={18} limite={40} />)

    expect(screen.getByText('18 de 40 vagas')).toBeInTheDocument()
    expect(screen.getByText('22 livres')).toBeInTheDocument()
    const barra = screen.getByRole('progressbar')
    expect(barra).toHaveAttribute('aria-valuenow', '18')
    expect(barra).toHaveAttribute('aria-valuemax', '40')
  })

  it('usa o singular quando resta uma vaga', () => {
    render(<ContadorVagas ocupadas={2} limite={3} />)
    expect(screen.getByText('1 livre')).toBeInTheDocument()
  })

  it('avisa quando as vagas estão esgotadas', () => {
    render(<ContadorVagas ocupadas={3} limite={3} />)

    expect(screen.getByText('3 de 3 vagas')).toBeInTheDocument()
    expect(screen.getByText('esgotadas')).toBeInTheDocument()
  })

  it('enquanto a contagem não chega, mostra só o total', () => {
    render(<ContadorVagas ocupadas={null} limite={40} />)

    expect(screen.getByText('40 vagas')).toBeInTheDocument()
    expect(screen.queryByText(/livre/)).not.toBeInTheDocument()
  })
})
