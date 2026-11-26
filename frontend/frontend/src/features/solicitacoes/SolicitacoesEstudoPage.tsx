import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import '../../estilos/agenda.css'
import '../../estilos/historico.css'
import '../../estilos/solicitacoes.css'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AbasEstudo } from '../estudos/AbasEstudo'
import { isoParaBR } from '../estudos/datas'
import { buscarEstudo } from '../estudos/estudosService'
import { ROTULO_ESTADO, type Estudo } from '../estudos/tipos'
import { dataHoraBR } from '../visitas/datas'
import { ErroVisitaApi } from '../visitas/visitasService'
import { DecisaoSolicitacaoDialogo, type Decisao, type ErroDecisao } from './DecisaoSolicitacaoDialogo'
import { aprovarSolicitacao, listarSolicitacoes, recusarSolicitacao } from './solicitacoesService'
import {
  ROTULO_STATUS_SOLICITACAO,
  ROTULO_TIPO_SOLICITACAO,
  type Solicitacao,
  type StatusSolicitacao,
  type TipoSolicitacao,
} from './tipos'

// T-119: o coordenador vê as solicitações do estudo (reagendamento RF19, retirada RF20) e aprova ou recusa.
// Abre nas pendentes. Status e tipo vão para a API; a busca por texto é feita na tela.

type FiltroStatus = StatusSolicitacao | 'TODOS'
type FiltroTipo = TipoSolicitacao | 'TODOS'

const FILTROS_STATUS: FiltroStatus[] = ['PENDENTE', 'APROVADA', 'RECUSADA', 'TODOS']
const ROTULO_FILTRO_STATUS: Record<FiltroStatus, string> = {
  PENDENTE: 'Pendentes',
  APROVADA: 'Aprovadas',
  RECUSADA: 'Recusadas',
  TODOS: 'Todas',
}

function mensagemSucesso(s: Solicitacao): string {
  const nome = s.participante.nome
  if (s.status === 'RECUSADA') {
    return `Solicitação de ${s.tipo === 'RETIRADA' ? 'retirada' : 'reagendamento'} de ${nome} recusada.`
  }
  return s.tipo === 'RETIRADA'
    ? `Retirada de ${nome} aprovada. O participante foi retirado do estudo e a vaga foi liberada.`
    : `Reagendamento de ${nome} aprovado.`
}

function InfoDecisao({ s }: { s: Solicitacao }) {
  if (s.status === 'PENDENTE') return null
  return (
    <small>
      {s.decididaPor ? `Por ${s.decididaPor}` : 'Decidida'}
      {s.decididaEm ? ` em ${dataHoraBR(s.decididaEm)}` : ''}
      {s.status === 'RECUSADA' && s.justificativa ? ` · ${s.justificativa}` : ''}
    </small>
  )
}

export function SolicitacoesEstudoPage() {
  const { estudoId } = useParams<{ estudoId: string }>()
  const idEstudo = Number(estudoId)

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [tentativa, setTentativa] = useState(0)

  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('PENDENTE')
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>('TODOS')
  const [busca, setBusca] = useState('')

  const [decidindo, setDecidindo] = useState<{ solicitacao: Solicitacao; decisao: Decisao } | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  const [erroDecisao, setErroDecisao] = useState<ErroDecisao | null>(null)
  const [sucesso, setSucesso] = useState<Solicitacao | null>(null)

  // O estudo é só para o cabeçalho: se falhar, a lista continua funcionando
  useEffect(() => {
    let ativo = true
    buscarEstudo(idEstudo)
      .then((e) => {
        if (ativo) setEstudo(e)
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [idEstudo])

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro('')
    listarSolicitacoes(idEstudo, {
      status: filtroStatus === 'TODOS' ? undefined : filtroStatus,
      tipo: filtroTipo === 'TODOS' ? undefined : filtroTipo,
    })
      .then((dados) => {
        if (ativo) setSolicitacoes(dados)
      })
      .catch((e: Error) => {
        if (ativo) {
          setSolicitacoes([])
          setErro(e.message)
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [idEstudo, filtroStatus, filtroTipo, tentativa])

  // Também filtra na tela: depois de decidir, a solicitação sai da lista de pendentes sem recarregar
  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return solicitacoes.filter((s) => {
      if (filtroStatus !== 'TODOS' && s.status !== filtroStatus) return false
      if (filtroTipo !== 'TODOS' && s.tipo !== filtroTipo) return false
      if (!termo) return true
      return [s.participante.nome, s.participante.email, s.visita?.nome ?? '', s.motivo ?? ''].some((v) =>
        v.toLowerCase().includes(termo),
      )
    })
  }, [solicitacoes, filtroStatus, filtroTipo, busca])

  const temFiltroAtivo = busca.trim() !== '' || filtroStatus !== 'PENDENTE' || filtroTipo !== 'TODOS'

  function limparFiltros() {
    setBusca('')
    setFiltroStatus('PENDENTE')
    setFiltroTipo('TODOS')
  }

  function abrirDecisao(solicitacao: Solicitacao, decisao: Decisao) {
    setSucesso(null)
    setErroDecisao(null)
    setDecidindo({ solicitacao, decisao })
  }

  function fecharDecisao() {
    setDecidindo(null)
    setErroDecisao(null)
  }

  async function confirmarDecisao(justificativa: string) {
    if (!decidindo) return
    const { solicitacao, decisao } = decidindo
    setConfirmando(true)
    setErroDecisao(null)
    try {
      const atualizada =
        decisao === 'APROVAR'
          ? await aprovarSolicitacao(solicitacao.id)
          : await recusarSolicitacao(solicitacao.id, justificativa)
      setSolicitacoes((lista) => lista.map((s) => (s.id === atualizada.id ? atualizada : s)))
      setSucesso(atualizada)
      setDecidindo(null)
    } catch (e) {
      const erroApi = e instanceof ErroVisitaApi ? e : null
      setErroDecisao({
        texto: erroApi?.message ?? 'Não foi possível falar com o servidor. Tente novamente.',
        jaDecidida: erroApi?.codigo === 'SOLICITACAO_JA_DECIDIDA',
      })
    } finally {
      setConfirmando(false)
    }
  }

  const encerrado = estudo?.estado === 'ENCERRADO'
  const listaCandidatos = `/estudos/${idEstudo}/candidatos`

  return (
    <div className="pagina">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / {estudo?.titulo ?? 'Estudo'} / Solicitações
      </nav>

      <AbasEstudo estudoId={idEstudo} ativa="solicitacoes" />

      <div className="pagina__cabecalho">
        <div>
          <div className="titulo-com-selo">
            <h1>Solicitações dos participantes</h1>
            {estudo && (
              <span className={`selo selo--${estudo.estado.toLowerCase()}`}>{ROTULO_ESTADO[estudo.estado]}</span>
            )}
          </div>
          <p className="pagina__subtitulo">
            Pedidos de reagendamento de visita e de retirada voluntária enviados pelo aplicativo.
          </p>
        </div>
        <Link to={listaCandidatos} className="botao botao--contorno">
          Candidatos
        </Link>
      </div>

      {encerrado && (
        <div className="aviso aviso--atencao" role="status">
          <strong>Estudo encerrado.</strong> As solicitações ficam apenas para consulta.
        </div>
      )}

      <section className="cartao agenda-filtros" aria-label="Filtros das solicitações">
        <div className="agenda-filtros__linha">
          <input
            className="pn-campo__entrada filtros__busca"
            type="search"
            placeholder="Buscar por participante, e-mail, visita ou motivo"
            aria-label="Buscar por participante, e-mail, visita ou motivo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select
            className="pn-campo__entrada agenda-filtros__periodo"
            aria-label="Filtrar por tipo"
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
          >
            <option value="TODOS">Todos os tipos</option>
            <option value="REAGENDAMENTO">{ROTULO_TIPO_SOLICITACAO.REAGENDAMENTO}</option>
            <option value="RETIRADA">{ROTULO_TIPO_SOLICITACAO.RETIRADA}</option>
          </select>
        </div>
        <div className="agenda-filtros__linha">
          <div className="chips" role="group" aria-label="Filtrar por status">
            {FILTROS_STATUS.map((s) => (
              <button
                key={s}
                type="button"
                className={s === filtroStatus ? 'chip chip--ativo' : 'chip'}
                aria-pressed={s === filtroStatus}
                onClick={() => setFiltroStatus(s)}
              >
                {ROTULO_FILTRO_STATUS[s]}
              </button>
            ))}
          </div>
          {temFiltroAtivo && (
            <button type="button" className="botao botao--contorno botao--pequeno" onClick={limparFiltros}>
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      {sucesso && (
        <div className="aviso aviso--sucesso" role="status">
          {mensagemSucesso(sucesso)}{' '}
          {sucesso.status === 'APROVADA' &&
            (sucesso.tipo === 'REAGENDAMENTO' ? (
              <Link to={`/estudos/${idEstudo}/agenda`} className="link">
                Ver na agenda
              </Link>
            ) : (
              <Link to={`${listaCandidatos}/${sucesso.participante.candidatoId}/historico`} className="link">
                Ver histórico
              </Link>
            ))}
        </div>
      )}

      {/* Estado de erro */}
      {!carregando && erro && (
        <section className="cartao agenda-estado" role="alert">
          <div className="agenda-estado__icone" aria-hidden="true">
            !
          </div>
          <h2>Não foi possível carregar as solicitações</h2>
          <p>{erro}</p>
          <div className="agenda-estado__acoes">
            <button type="button" className="botao botao--contorno" onClick={() => setTentativa((n) => n + 1)}>
              Tentar de novo
            </button>
          </div>
        </section>
      )}

      {/* Estado carregando */}
      {carregando && (
        <section className="cartao agenda-estado" role="status" aria-live="polite">
          <div className="agenda-estado__icone" aria-hidden="true">
            ⌛
          </div>
          <h2>Carregando solicitações…</h2>
          <p>Buscando os pedidos de reagendamento e de retirada enviados pelos participantes.</p>
          <div className="agenda-skeleton" aria-hidden="true">
            <div className="agenda-skeleton__linha" />
            <div className="agenda-skeleton__linha" />
            <div className="agenda-skeleton__linha" />
          </div>
        </section>
      )}

      {/* Estado vazio */}
      {!carregando && !erro && filtradas.length === 0 && (
        <section className="cartao agenda-estado" role="status">
          <div className="agenda-estado__icone" aria-hidden="true">
            ✓
          </div>
          <h2>
            {filtroStatus === 'PENDENTE' && !busca.trim()
              ? 'Nenhuma solicitação pendente'
              : 'Nenhuma solicitação encontrada'}
          </h2>
          <p>
            {temFiltroAtivo
              ? 'Nenhuma solicitação corresponde aos filtros selecionados. Tente limpar os filtros.'
              : 'Quando um participante pedir reagendamento de visita ou retirada do estudo pelo aplicativo, o pedido aparece aqui para você decidir.'}
          </p>
          {temFiltroAtivo && (
            <div className="agenda-estado__acoes">
              <button type="button" className="botao botao--contorno" onClick={limparFiltros}>
                Limpar filtros
              </button>
            </div>
          )}
        </section>
      )}

      {!carregando && !erro && filtradas.length > 0 && (
        <>
          <div className="cartao cartao--tabela">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Tipo</th>
                  <th>Visita</th>
                  <th>Motivo</th>
                  <th>Recebida em</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtradas.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.participante.nome}</strong>
                      <small>{s.participante.email}</small>
                    </td>
                    <td>
                      <span className={`selo selo--solicitacao-${s.tipo.toLowerCase()}`}>
                        {ROTULO_TIPO_SOLICITACAO[s.tipo]}
                      </span>
                    </td>
                    <td>
                      {s.visita ? (
                        <>
                          <strong>{s.visita.nome}</strong>
                          <small>
                            Atual: {dataHoraBR(s.visita.dataHora).replace(' ', ' às ')}
                            {s.visita.local ? ` · ${s.visita.local}` : ''}
                          </small>
                          {s.dataSugerida && <small>Sugerida: {isoParaBR(s.dataSugerida)}</small>}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="solicitacoes__motivo">{s.motivo || '—'}</td>
                    <td>{dataHoraBR(s.criadaEm)}</td>
                    <td>
                      <span className={`selo selo--solicitacao-${s.status.toLowerCase()}`}>
                        {ROTULO_STATUS_SOLICITACAO[s.status]}
                      </span>
                      <InfoDecisao s={s} />
                    </td>
                    <td className="tabela__acao">
                      {s.status === 'PENDENTE' && !encerrado ? (
                        <span className="tabela__acoes">
                          <button
                            type="button"
                            className="botao botao--primario botao--pequeno"
                            aria-label={`Aprovar solicitação de ${s.participante.nome}`}
                            onClick={() => abrirDecisao(s, 'APROVAR')}
                          >
                            Aprovar
                          </button>
                          <button
                            type="button"
                            className="botao botao--contorno botao--pequeno"
                            aria-label={`Recusar solicitação de ${s.participante.nome}`}
                            onClick={() => abrirDecisao(s, 'RECUSAR')}
                          >
                            Recusar
                          </button>
                        </span>
                      ) : (
                        <Link to={`${listaCandidatos}/${s.participante.candidatoId}/historico`} className="link">
                          Histórico
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="contagem">
            Mostrando {filtradas.length} de {solicitacoes.length}{' '}
            {solicitacoes.length === 1 ? 'solicitação' : 'solicitações'}
          </p>
        </>
      )}

      {decidindo && (
        <DecisaoSolicitacaoDialogo
          key={`${decidindo.solicitacao.id}-${decidindo.decisao}`}
          solicitacao={decidindo.solicitacao}
          decisao={decidindo.decisao}
          confirmando={confirmando}
          erro={erroDecisao}
          aoConfirmar={confirmarDecisao}
          aoCancelar={fecharDecisao}
          aoAtualizar={() => {
            fecharDecisao()
            setTentativa((n) => n + 1)
          }}
        />
      )}

      <footer className="pagina__rodape">
        <Link to="/estudos" className="botao botao--contorno">
          Voltar aos estudos
        </Link>
      </footer>
    </div>
  )
}
