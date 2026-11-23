import { useEffect, useId, useRef, useState } from 'react'

// T-86: dados de acesso do participante mostrados logo depois da inclusão, quando a conta foi criada agora.
// A senha fica só nas props deste diálogo (estado local da tela de detalhe). Não vai para estado global,
// localStorage nem URL: ao fechar, ela some e não aparece de novo (o backend também não a devolve mais).
export function AcessoParticipanteDialogo({
  nome,
  email,
  senha,
  aoFechar,
}: {
  nome: string
  email: string
  senha: string
  aoFechar: () => void
}) {
  const idTitulo = useId()
  const botaoCopiar = useRef<HTMLButtonElement>(null)
  const [copia, setCopia] = useState<'' | 'ok' | 'erro'>('')

  useEffect(() => {
    // O foco começa em Copiar: um Enter sem querer não fecha o diálogo e não perde a senha
    botaoCopiar.current?.focus()
    function teclado(e: KeyboardEvent) {
      if (e.key === 'Escape') aoFechar()
    }
    document.addEventListener('keydown', teclado)
    return () => document.removeEventListener('keydown', teclado)
  }, [aoFechar])

  async function copiar() {
    try {
      await navigator.clipboard.writeText(`E-mail: ${email}\nSenha inicial: ${senha}`)
      setCopia('ok')
    } catch {
      setCopia('erro')
    }
  }

  return (
    <div className="dialogo__fundo">
      <div className="cartao dialogo" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <h2 id={idTitulo}>Acesso do participante</h2>
        <p className="cartao__texto">
          {nome} foi incluído e já tem conta no aplicativo. Entregue estes dados ao participante.
        </p>

        <dl className="acesso__dados">
          <div>
            <dt>E-mail</dt>
            <dd>{email}</dd>
          </div>
          <div>
            <dt>Senha inicial</dt>
            <dd className="acesso__senha">{senha}</dd>
          </div>
        </dl>

        <div className="aviso aviso--atencao" role="note">
          <strong>Esta senha é exibida apenas uma vez. Entregue ao participante.</strong>
        </div>
        {copia === 'ok' && (
          <p className="acesso__copia" role="status">
            E-mail e senha copiados.
          </p>
        )}
        {copia === 'erro' && (
          <p className="acesso__copia acesso__copia--erro" role="status">
            Não foi possível copiar. Anote a senha antes de fechar.
          </p>
        )}

        <div className="dialogo__acoes">
          <button ref={botaoCopiar} type="button" className="botao botao--contorno" onClick={copiar}>
            Copiar
          </button>
          <button type="button" className="botao botao--primario" onClick={aoFechar}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
