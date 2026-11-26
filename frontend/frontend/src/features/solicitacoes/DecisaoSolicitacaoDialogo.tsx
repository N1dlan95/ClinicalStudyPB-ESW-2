import { useEffect, useId, useRef, useState } from 'react'
import { isoParaBR } from '../estudos/datas'
import type { Solicitacao } from './tipos'

// Diálogo para aprovar ou recusar uma solicitação (T-119). A justificativa é obrigatória na recusa (1 a 500).
// Se outra pessoa decidiu antes (409 SOLICITACAO_JA_DECIDIDA), o diálogo troca para a mensagem de "já decidida".

const LIMITE = 500

export type Decisao = 'APROVAR' | 'RECUSAR'

export interface ErroDecisao {
  texto: string
  jaDecidida: boolean
}

function consequencia(solicitacao: Solicitacao, decisao: Decisao): string {
  if (decisao === 'RECUSAR') {
    return solicitacao.tipo === 'RETIRADA'
      ? 'O participante continua no estudo e verá a justificativa no aplicativo.'
      : 'A visita continua na data atual e o participante verá a justificativa no aplicativo.'
  }
  if (solicitacao.tipo === 'RETIRADA') {
    return 'O participante será retirado do estudo: as visitas agendadas serão canceladas e a vaga ficará disponível.'
  }
  return solicitacao.dataSugerida
    ? `A visita será remarcada para a data sugerida (${isoParaBR(solicitacao.dataSugerida)}).`
    : 'A visita será marcada como reagendada. Ajuste a nova data na agenda do estudo.'
}

export function DecisaoSolicitacaoDialogo({
  solicitacao,
  decisao,
  confirmando,
  erro,
  aoConfirmar,
  aoCancelar,
  aoAtualizar,
}: {
  solicitacao: Solicitacao
  decisao: Decisao
  confirmando: boolean
  erro: ErroDecisao | null
  aoConfirmar: (justificativa: string) => void
  aoCancelar: () => void
  aoAtualizar: () => void
}) {
  const idTitulo = useId()
  const [justificativa, setJustificativa] = useState('')
  const [erroJustificativa, setErroJustificativa] = useState('')
  const campo = useRef<HTMLTextAreaElement>(null)
  const botaoCancelar = useRef<HTMLButtonElement>(null)
  const cancelar = useRef(aoCancelar)
  cancelar.current = aoCancelar
  const recusar = decisao === 'RECUSAR'

  useEffect(() => {
    if (recusar) campo.current?.focus()
    else botaoCancelar.current?.focus()
    function teclado(e: KeyboardEvent) {
      if (e.key === 'Escape') cancelar.current()
    }
    document.addEventListener('keydown', teclado)
    return () => document.removeEventListener('keydown', teclado)
  }, [recusar])

  function confirmar() {
    if (recusar && !justificativa.trim()) {
      setErroJustificativa('Informe a justificativa da recusa.')
      return
    }
    setErroJustificativa('')
    aoConfirmar(justificativa.trim())
  }

  const tipo = solicitacao.tipo === 'RETIRADA' ? 'a retirada' : 'o reagendamento'
  const titulo = `${recusar ? 'Recusar' : 'Aprovar'} ${tipo} de ${solicitacao.participante.nome}?`
  const jaDecidida = erro?.jaDecidida === true

  return (
    <div className="dialogo__fundo">
      <div className="cartao dialogo" role="dialog" aria-modal="true" aria-labelledby={idTitulo}>
        <h2 id={idTitulo}>{titulo}</h2>

        {jaDecidida ? (
          <>
            <div className="aviso aviso--erro" role="alert">
              <strong>Solicitação já decidida.</strong> {erro?.texto}
            </div>
            <div className="dialogo__acoes">
              <button type="button" className="botao botao--contorno" onClick={aoCancelar}>
                Fechar
              </button>
              <button type="button" className="botao botao--primario" onClick={aoAtualizar}>
                Atualizar a lista
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={recusar ? 'aviso aviso--info' : 'aviso aviso--atencao'}>
              {consequencia(solicitacao, decisao)}
            </div>
            {recusar && (
              <label className="pn-campo">
                <span className="pn-campo__rotulo">Justificativa da recusa *</span>
                <textarea
                  ref={campo}
                  className={
                    erroJustificativa ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'
                  }
                  rows={4}
                  maxLength={LIMITE}
                  aria-invalid={erroJustificativa ? true : undefined}
                  value={justificativa}
                  disabled={confirmando}
                  onChange={(e) => {
                    setJustificativa(e.target.value)
                    if (e.target.value.trim()) setErroJustificativa('')
                  }}
                />
                <span className="retirada__contador">
                  {justificativa.length}/{LIMITE}
                </span>
                {erroJustificativa && <span className="pn-campo__erro">{erroJustificativa}</span>}
              </label>
            )}
            {erro && (
              <div className="aviso aviso--erro" role="alert">
                {erro.texto}
              </div>
            )}
            <div className="dialogo__acoes">
              <button
                ref={botaoCancelar}
                type="button"
                className="botao botao--contorno"
                onClick={aoCancelar}
                disabled={confirmando}
              >
                Cancelar
              </button>
              <button type="button" className="botao botao--primario" onClick={confirmar} disabled={confirmando}>
                {confirmando
                  ? recusar
                    ? 'Recusando…'
                    : 'Aprovando…'
                  : recusar
                    ? 'Confirmar recusa'
                    : 'Confirmar aprovação'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
