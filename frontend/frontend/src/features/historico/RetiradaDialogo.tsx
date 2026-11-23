import { useEffect, useId, useRef, useState } from 'react'

// Diálogo da retirada (RF16, T-99). O motivo é obrigatório (1 a 500 caracteres).
// Se outra pessoa retirou o participante antes, o diálogo troca para a mensagem de "já retirado".

const LIMITE = 500

export interface ErroRetirada {
  texto: string
  jaRetirado: boolean
}

export function RetiradaDialogo({
  nome,
  confirmando,
  erro,
  aoConfirmar,
  aoCancelar,
  aoAtualizar,
}: {
  nome: string
  confirmando: boolean
  erro: ErroRetirada | null
  aoConfirmar: (motivo: string) => void
  aoCancelar: () => void
  aoAtualizar: () => void
}) {
  const idTitulo = useId()
  const [motivo, setMotivo] = useState('')
  const [erroMotivo, setErroMotivo] = useState('')
  const campo = useRef<HTMLTextAreaElement>(null)
  const cancelar = useRef(aoCancelar)
  cancelar.current = aoCancelar

  useEffect(() => {
    campo.current?.focus()
    function teclado(e: KeyboardEvent) {
      if (e.key === 'Escape') cancelar.current()
    }
    document.addEventListener('keydown', teclado)
    return () => document.removeEventListener('keydown', teclado)
  }, [])

  function confirmar() {
    if (!motivo.trim()) {
      setErroMotivo('Informe o motivo da retirada.')
      return
    }
    setErroMotivo('')
    aoConfirmar(motivo.trim())
  }

  const jaRetirado = erro?.jaRetirado === true

  return (
    <div className="dialogo__fundo">
      <div className="cartao dialogo" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <h2 id={idTitulo}>Registrar a retirada de {nome}?</h2>

        {jaRetirado ? (
          <>
            <div className="aviso aviso--erro" role="alert">
              <strong>Participante já retirado.</strong> {erro?.texto}
            </div>
            <div className="dialogo__acoes">
              <button type="button" className="botao botao--contorno" onClick={aoCancelar}>
                Fechar
              </button>
              <button type="button" className="botao botao--primario" onClick={aoAtualizar}>
                Atualizar a página
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="aviso aviso--atencao">
              As visitas agendadas serão canceladas e a vaga ficará disponível.
            </div>
            <label className="pn-campo">
              <span className="pn-campo__rotulo">Motivo da retirada *</span>
              <textarea
                ref={campo}
                className={erroMotivo ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'}
                rows={4}
                maxLength={LIMITE}
                aria-invalid={erroMotivo ? true : undefined}
                value={motivo}
                disabled={confirmando}
                onChange={(e) => {
                  setMotivo(e.target.value)
                  if (e.target.value.trim()) setErroMotivo('')
                }}
              />
              <span className="retirada__contador">
                {motivo.length}/{LIMITE}
              </span>
              {erroMotivo && <span className="pn-campo__erro">{erroMotivo}</span>}
            </label>
            {erro && (
              <div className="aviso aviso--erro" role="alert">
                {erro.texto}
              </div>
            )}
            <div className="dialogo__acoes">
              <button type="button" className="botao botao--contorno" onClick={aoCancelar} disabled={confirmando}>
                Cancelar
              </button>
              <button type="button" className="botao botao--primario" onClick={confirmar} disabled={confirmando}>
                {confirmando ? 'Registrando…' : 'Confirmar retirada'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
