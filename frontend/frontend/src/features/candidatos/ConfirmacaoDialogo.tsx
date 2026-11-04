import { useEffect, useId, useRef, type ReactNode } from 'react'

// Diálogo de confirmação simples (sem dependência externa). Fecha com Esc ou "Cancelar".
export function ConfirmacaoDialogo({
  titulo,
  children,
  rotuloConfirmar,
  rotuloConfirmando = 'Salvando…',
  confirmando,
  aoConfirmar,
  aoCancelar,
}: {
  titulo: string
  children: ReactNode
  rotuloConfirmar: string
  rotuloConfirmando?: string
  confirmando?: boolean
  aoConfirmar: () => void
  aoCancelar: () => void
}) {
  const idTitulo = useId()
  const botaoCancelar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    botaoCancelar.current?.focus()
    function teclado(e: KeyboardEvent) {
      if (e.key === 'Escape') aoCancelar()
    }
    document.addEventListener('keydown', teclado)
    return () => document.removeEventListener('keydown', teclado)
  }, [aoCancelar])

  return (
    <div className="dialogo__fundo">
      <div className="cartao dialogo" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <h2 id={idTitulo}>{titulo}</h2>
        {children}
        <div className="dialogo__acoes">
          <button ref={botaoCancelar} type="button" className="botao botao--contorno" onClick={aoCancelar}>
            Cancelar
          </button>
          <button type="button" className="botao botao--primario" onClick={aoConfirmar} disabled={confirmando}>
            {confirmando ? rotuloConfirmando : rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
