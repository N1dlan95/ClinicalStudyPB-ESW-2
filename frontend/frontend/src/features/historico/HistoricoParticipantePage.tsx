import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import '../../estilos/visitas.css'
import '../../estilos/historico.css'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAutorizacao } from '../auth/useAutorizacao'
import { ROTULO_STATUS_CANDIDATO } from '../candidatos/tipos'
import { isoParaBR } from '../estudos/datas'
import { dataHoraBR } from '../visitas/datas'
import { ROTULO_STATUS_VISITA, type ItemResultado } from '../visitas/tipos'
import { ErroVisitaApi } from '../visitas/visitasService'
import { buscarHistorico, registrarRetirada } from './historicoService'
import { RetiradaDialogo, type ErroRetirada } from './RetiradaDialogo'
import type { Historico, HistoricoVisita } from './tipos'

// RF15 (T-97): histórico do participante. Visitas da mais antiga para a mais recente, cada uma com os
// resultados registrados. O coordenador também registra a retirada do participante (RF16, T-99).
// Pesquisador, coordenador e administrador consultam; o link de resultados muda para o coordenador.

function quando(visita: HistoricoVisita): string {
  const dataHora = dataHoraBR(visita.dataHora).replace(' ', ' às ')
  return visita.local ? `${dataHora} · ${visita.local}` : dataHora
}

function mensagemDeErro(erro: unknown): { titulo: string; texto: string; tentarDeNovo: boolean } {
  const e = erro instanceof ErroVisitaApi ? erro : null
  if (e?.codigo === 'PARTICIPANTE_NAO_INCLUIDO' || e?.status === 409) {
    return {
      titulo: 'Candidato sem histórico',
      texto: 'Este candidato nunca foi incluído no estudo, por isso não tem histórico.',
      tentarDeNovo: false,
    }
  }
  if (e?.status === 404) {
    return { titulo: 'Candidato não encontrado', texto: 'Verifique o endereço e tente de novo.', tentarDeNovo: false }
  }
  return {
    titulo: 'Não foi possível carregar o histórico',
    texto: e?.message ?? 'Não foi possível falar com o servidor. Tente novamente.',
    tentarDeNovo: true,
  }
}

function TabelaResultados({ itens }: { itens: ItemResultado[] }) {
  const ordenados = [...itens].sort((a, b) => a.ordem - b.ordem)
  return (
    <div className="visita-item__tabela">
      <table className="tabela">
        <thead>
          <tr>
            <th>Atividade</th>
            <th>Resultado</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>
          {ordenados.map((item) => (
            <tr key={item.atividadeId}>
              <td>
                #{item.ordem} · {item.descricao}
              </td>
              <td>{item.resultado ?? '—'}</td>
              <td>{item.observacao || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ItemVisita({
  visita,
  estudoId,
  podeEditar,
}: {
  visita: HistoricoVisita
  estudoId: number
  podeEditar: boolean
}) {
  const status = visita.status.toLowerCase()
  const linkResultados = `/estudos/${estudoId}/visitas/${visita.id}/resultados`
  const rotuloLink = podeEditar && visita.status === 'REALIZADA' ? 'Ver e editar resultados' : 'Ver resultados'

  let detalhe
  switch (visita.status) {
    case 'REALIZADA':
      detalhe =
        visita.resultados.length > 0 ? (
          <TabelaResultados itens={visita.resultados} />
        ) : (
          <p className="visita-item__texto">Nenhum resultado registrado ainda.</p>
        )
      break
    case 'AUSENTE':
      detalhe = <p className="visita-item__texto">Sem resultados: o participante não compareceu.</p>
      break
    case 'CANCELADA':
      detalhe = (
        <p className="visita-item__texto">
          <strong>Motivo do cancelamento:</strong> {visita.observacao || 'não informado'}
        </p>
      )
      break
    default:
      detalhe = (
        <p className="visita-item__texto">
          Os resultados podem ser registrados depois que a visita for realizada.
        </p>
      )
  }

  return (
    <li className="visita-item">
      <span className={`visita-item__ponto visita-item__ponto--${status}`} aria-hidden="true" />
      <div className="visita-item__corpo">
        <div className="visita-item__topo">
          <strong>{visita.visitaPrevista.nome}</strong>
          <span className={`selo selo--visita-${status}`}>{ROTULO_STATUS_VISITA[visita.status]}</span>
        </div>
        <p className="visita-item__quando">{quando(visita)}</p>
        {detalhe}
        {visita.observacao && visita.status !== 'CANCELADA' && (
          <p className="visita-item__texto">
            <strong>Observação:</strong> {visita.observacao}
          </p>
        )}
        {visita.status !== 'CANCELADA' && visita.status !== 'AUSENTE' && (
          <div>
            <Link to={linkResultados} className="link">
              {rotuloLink}
            </Link>
          </div>
        )}
      </div>
    </li>
  )
}

export function HistoricoParticipantePage() {
  const { estudoId, id } = useParams<{ estudoId: string; id: string }>()
  const idEstudo = Number(estudoId)
  const idCandidato = Number(id)
  const navegar = useNavigate()
  const { pode } = useAutorizacao()

  const [historico, setHistorico] = useState<Historico | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<ReturnType<typeof mensagemDeErro> | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const [retirando, setRetirando] = useState(false)
  const [dialogoRetirada, setDialogoRetirada] = useState(false)
  const [erroRetirada, setErroRetirada] = useState<ErroRetirada | null>(null)
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)
    buscarHistorico(idCandidato)
      .then((dados) => {
        if (ativo) setHistorico(dados)
      })
      .catch((e) => {
        if (ativo) setErro(mensagemDeErro(e))
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [idCandidato, tentativa])

  async function confirmarRetirada(motivo: string) {
    setRetirando(true)
    setErroRetirada(null)
    try {
      const resultado = await registrarRetirada(idCandidato, motivo)
      const canceladas =
        resultado.visitasCanceladas === 0
          ? 'Nenhuma visita agendada foi cancelada.'
          : resultado.visitasCanceladas === 1
            ? '1 visita agendada foi cancelada.'
            : `${resultado.visitasCanceladas} visitas agendadas foram canceladas.`
      setSucesso(
        `Retirada registrada. ${canceladas} Vagas ocupadas: ${resultado.vagasOcupadas} de ${resultado.limiteParticipantes}.`,
      )
      setDialogoRetirada(false)
      try {
        setHistorico(await buscarHistorico(idCandidato))
      } catch {
        setSucesso((atual) => `${atual} Atualize a página para ver o histórico atualizado.`)
      }
    } catch (e) {
      const erro = e instanceof ErroVisitaApi ? e : null
      setErroRetirada({
        texto: erro?.message ?? 'Não foi possível falar com o servidor. Tente novamente.',
        jaRetirado: erro?.codigo === 'PARTICIPANTE_JA_RETIRADO',
      })
    } finally {
      setRetirando(false)
    }
  }

  function fecharDialogoRetirada() {
    setDialogoRetirada(false)
    setErroRetirada(null)
  }

  const listaCandidatos = `/estudos/${idEstudo}/candidatos`
  // A lista e o detalhe de candidatos são do coordenador; para os outros perfis, o nível fica sem link
  const linkCandidatos = pode('gerenciarCandidatos')

  if (carregando) {
    return (
      <div className="pagina" aria-busy="true">
        <div className="cartao" style={{ padding: 16, marginBottom: 14 }}>
          <div className="esqueleto esqueleto--titulo" />
          <div className="esqueleto esqueleto--linha" />
        </div>
        <p>Carregando o histórico…</p>
      </div>
    )
  }

  const participante = historico?.participante
  const estudo = historico?.estudo
  const visitas = historico?.visitas ?? []
  const podeEditar = pode('registrarResultados')

  return (
    <div className="pagina">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / {estudo?.titulo ?? 'Estudo'} /{' '}
        {linkCandidatos ? <Link to={listaCandidatos}>Candidatos</Link> : 'Candidatos'} /{' '}
        {participante ? (
          linkCandidatos ? (
            <Link to={`${listaCandidatos}/${participante.candidatoId}`}>{participante.nome}</Link>
          ) : (
            participante.nome
          )
        ) : (
          'Participante'
        )}{' '}
        / Histórico
      </nav>

      <div className="pagina__cabecalho">
        <div className="titulo-com-selo">
          <h1>{participante?.nome ?? 'Histórico do participante'}</h1>
          {participante && (
            <span className={`selo selo--candidato-${participante.status.toLowerCase()}`}>
              {ROTULO_STATUS_CANDIDATO[participante.status]}
            </span>
          )}
        </div>
        {/* T-90: botão "Agendar visita" entra aqui quando a tela for integrada. */}
        <div className="historico__cabecalho-acoes">
          {participante?.status === 'INCLUIDO' && pode('registrarRetirada') && (
            <button
              type="button"
              className="botao botao--contorno"
              onClick={() => {
                setSucesso('')
                setDialogoRetirada(true)
              }}
            >
              Registrar retirada
            </button>
          )}
        </div>
      </div>

      {erro && (
        <>
          <div className="aviso aviso--erro" role="alert">
            <strong>{erro.titulo}.</strong> {erro.texto}
          </div>
          {erro.tentarDeNovo && (
            <button type="button" className="botao botao--contorno" onClick={() => setTentativa((n) => n + 1)}>
              Tentar de novo
            </button>
          )}
        </>
      )}

      {sucesso && (
        <div className="aviso aviso--sucesso" role="status">
          {sucesso}
        </div>
      )}

      {participante && (
        <>
          <div className="cartao dados-candidato">
            <div>
              <small>E-mail</small>
              <strong>{participante.email}</strong>
            </div>
            <div>
              <small>Estudo</small>
              <strong>{estudo?.titulo ?? '—'}</strong>
            </div>
            <div>
              <small>Data de inclusão</small>
              <strong>{isoParaBR(participante.dataInclusao) || '—'}</strong>
            </div>
            <div>
              <small>Status</small>
              <strong>{ROTULO_STATUS_CANDIDATO[participante.status]}</strong>
            </div>
          </div>

          {participante.retirada && (
            <div className="aviso aviso--atencao" role="status">
              <strong>Participante retirado</strong> em {dataHoraBR(participante.retirada.registradaEm)} por{' '}
              {participante.retirada.registradaPor}. <strong>Motivo:</strong> {participante.retirada.motivo}
            </div>
          )}

          <section className="cartao linha-tempo" aria-labelledby="titulo-linha-tempo">
            <div className="linha-tempo__titulo">
              <h2 id="titulo-linha-tempo">Linha do tempo das visitas</h2>
              {visitas.length > 0 && (
                <small>
                  {visitas.length} {visitas.length === 1 ? 'visita' : 'visitas'} · da mais antiga para a mais
                  recente
                </small>
              )}
            </div>
            {visitas.length === 0 ? (
              <div className="estado-vazio">
                <strong>Nenhuma visita ainda</strong>
                <p>As visitas agendadas na agenda do estudo aparecem aqui, da mais antiga para a mais recente.</p>
              </div>
            ) : (
              <ol className="linha-tempo__lista">
                {visitas.map((visita) => (
                  <ItemVisita key={visita.id} visita={visita} estudoId={estudo?.id ?? idEstudo} podeEditar={podeEditar} />
                ))}
              </ol>
            )}
          </section>
        </>
      )}

      {dialogoRetirada && participante && (
        <RetiradaDialogo
          nome={participante.nome}
          confirmando={retirando}
          erro={erroRetirada}
          aoConfirmar={confirmarRetirada}
          aoCancelar={fecharDialogoRetirada}
          aoAtualizar={() => {
            fecharDialogoRetirada()
            setTentativa((n) => n + 1)
          }}
        />
      )}

      <footer className="pagina__rodape">
        <button type="button" className="botao botao--contorno" onClick={() => navegar(-1)}>
          Voltar
        </button>
      </footer>
    </div>
  )
}
