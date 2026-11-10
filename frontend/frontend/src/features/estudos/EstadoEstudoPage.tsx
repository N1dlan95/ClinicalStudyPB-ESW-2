import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ConfirmacaoDialogo } from '../candidatos/ConfirmacaoDialogo'
import { AbasEstudo } from './AbasEstudo'
import { isoParaBR } from './datas'
import { alterarEstadoEstudo, buscarEstudo, traduzirErro } from './estudosService'
import {
  DESCRICAO_ESTADO,
  ROTULO_ESTADO,
  TRANSICOES_ESTADO,
  type EstadoEstudo,
  type Estudo,
} from './tipos'

const ORDEM_ESTADOS: EstadoEstudo[] = ['PLANEJAMENTO', 'RECRUTAMENTO', 'EXECUCAO', 'ENCERRADO']

const ROTULO_BOTAO_TRANSICAO: Record<EstadoEstudo, string> = {
  PLANEJAMENTO: 'Retornar para Planejamento',
  RECRUTAMENTO: 'Iniciar recrutamento',
  EXECUCAO: 'Avançar para Em execução',
  ENCERRADO: 'Encerrar estudo',
}

export function EstadoEstudoPage() {
  const { id } = useParams<{ id: string }>()
  const estudoId = Number(id)

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [alterando, setAlterando] = useState(false)
  const [confirmandoPara, setConfirmandoPara] = useState<EstadoEstudo | null>(null)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    let ativo = true
    buscarEstudo(estudoId)
      .then((dados) => {
        if (ativo) setEstudo(dados)
      })
      .catch((e) => {
        if (ativo) setErro(`Não foi possível carregar o estudo. ${traduzirErro(e).message}`)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [estudoId])

  async function confirmarMudanca() {
    if (!confirmandoPara) return
    const destino = confirmandoPara
    setAlterando(true)
    setErro('')
    setSucesso('')
    try {
      const atualizado = await alterarEstadoEstudo(estudoId, destino)
      setEstudo(atualizado)
      setSucesso(`Estado do estudo alterado para ${ROTULO_ESTADO[atualizado.estado]}.`)
    } catch (e) {
      setErro(`Não foi possível alterar o estado do estudo. ${traduzirErro(e).message}`)
    } finally {
      setAlterando(false)
      setConfirmandoPara(null)
    }
  }

  if (carregando) {
    return (
      <div className="pagina">
        <p>Carregando estado do estudo…</p>
      </div>
    )
  }

  const indiceAtual = estudo ? ORDEM_ESTADOS.indexOf(estudo.estado) : -1
  const transicoesValidas = estudo ? TRANSICOES_ESTADO[estudo.estado] : []

  return (
    <div className="pagina">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / {estudo?.titulo ?? 'Estudo'} / Estado do estudo
      </nav>

      <AbasEstudo estudoId={estudoId} ativa="estado" />

      <div className="pagina__cabecalho">
        <div>
          <div className="titulo-com-selo">
            <h1>Estado do estudo</h1>
            {estudo && (
              <span className={`selo selo--${estudo.estado.toLowerCase()}`}>
                {ROTULO_ESTADO[estudo.estado]}
              </span>
            )}
          </div>
          <p className="pagina__subtitulo">
            Controle de fases do ciclo de vida do estudo clínico conforme as transições permitidas.
          </p>
        </div>
      </div>

      {erro && (
        <div className="aviso aviso--erro" role="alert">
          {erro}
        </div>
      )}
      {sucesso && (
        <div className="aviso aviso--sucesso" role="status">
          {sucesso}
        </div>
      )}

      {estudo && (
        <>
          <div className="fluxo-estados" aria-label="Ciclo de vida do estudo">
            {ORDEM_ESTADOS.map((fase, indice) => {
              let classe = 'fluxo-estados__passo'
              if (indice === indiceAtual) classe += ' fluxo-estados__passo--ativo'
              else if (indice < indiceAtual) classe += ' fluxo-estados__passo--concluido'
              return (
                <div key={fase} className={classe}>
                  <small>Etapa {indice + 1}</small>
                  <strong>{ROTULO_ESTADO[fase]}</strong>
                </div>
              )
            })}
          </div>

          <div className="indicadores">
            <div className="cartao indicador">
              <small>Responsável</small>
              <strong>{estudo.responsavel.nome}</strong>
            </div>
            <div className="cartao indicador">
              <small>Período previsto</small>
              <strong>
                {isoParaBR(estudo.dataInicio)} – {estudo.dataFim ? isoParaBR(estudo.dataFim) : 'sem data'}
              </strong>
            </div>
            <div className="cartao indicador">
              <small>Limite de participantes</small>
              <strong>{estudo.limiteParticipantes} vagas</strong>
            </div>
          </div>

          <section className="cartao cartao--secao" aria-labelledby="titulo-controle-estado">
            <h2 id="titulo-controle-estado">
              Fase atual: {ROTULO_ESTADO[estudo.estado]}
            </h2>
            <p className="cartao__texto">{DESCRICAO_ESTADO[estudo.estado]}</p>

            {transicoesValidas.length > 0 ? (
              <div className="formulario__acoes" style={{ marginTop: '6px' }}>
                {transicoesValidas.map((destino) => {
                  const ehRetorno = destino === 'PLANEJAMENTO'
                  return (
                    <button
                      key={destino}
                      type="button"
                      className={ehRetorno ? 'botao botao--contorno' : 'botao botao--primario'}
                      disabled={alterando}
                      onClick={() => setConfirmandoPara(destino)}
                    >
                      {ROTULO_BOTAO_TRANSICAO[destino]}
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="cartao__texto">
                <strong>Estudo finalizado.</strong> O estado Encerrado é terminal e não possui transição de saída.
              </p>
            )}
          </section>
        </>
      )}

      {confirmandoPara && estudo && (
        <ConfirmacaoDialogo
          titulo={`Alterar estado para ${ROTULO_ESTADO[confirmandoPara]}?`}
          rotuloConfirmar="Confirmar mudança"
          rotuloConfirmando="Alterando…"
          confirmando={alterando}
          aoConfirmar={confirmarMudanca}
          aoCancelar={() => setConfirmandoPara(null)}
        >
          <p className="cartao__texto">
            O estudo &ldquo;{estudo.titulo}&rdquo; passará de{' '}
            <strong>{ROTULO_ESTADO[estudo.estado]}</strong> para{' '}
            <strong>{ROTULO_ESTADO[confirmandoPara]}</strong>.{' '}
            {DESCRICAO_ESTADO[confirmandoPara]}
          </p>
        </ConfirmacaoDialogo>
      )}
      <footer className="pagina__rodape">
        <Link to="/estudos" className="botao botao--contorno">
          Voltar aos estudos
        </Link>
      </footer>
    </div>
  )
}
