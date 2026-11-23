import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import '../../estilos/agenda.css'
import { useContext, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AuthContext } from '../auth/AuthContext'
import { temPermissao } from '../auth/permissoes'
import { AbasEstudo } from '../estudos/AbasEstudo'
import { isoParaBR } from '../estudos/datas'
import { buscarEstudo } from '../estudos/estudosService'
import { ROTULO_ESTADO, type Estudo } from '../estudos/tipos'
import { listarVisitasAgendadas, traduzirErro } from './agendaService'
import {
  ROTULO_PERIODO_VISITA,
  ROTULO_STATUS_VISITA,
  type PeriodoFiltroVisita,
  type StatusVisitaAgendada,
  type VisitaAgendada,
} from './tipos'
import { atendeFiltroPeriodo } from './validacao'

const FILTROS_STATUS: (StatusVisitaAgendada | 'TODOS')[] = [
  'TODOS',
  'AGENDADA',
  'REALIZADA',
  'AUSENTE',
  'CANCELADA',
]

const FILTROS_PERIODO: PeriodoFiltroVisita[] = [
  'TODOS',
  'HOJE',
  'PROXIMOS_7_DIAS',
  'ESTE_MES',
  'ATRASADAS',
]

export function AgendaEstudoPage() {
  const { id } = useParams<{ id: string }>()
  const estudoId = Number(id)
  const auth = useContext(AuthContext)
  const podeAlterarEstadoVisita = temPermissao(auth?.usuario?.perfil, 'gerenciarVisitas')

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [visitas, setVisitas] = useState<VisitaAgendada[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusVisitaAgendada | 'TODOS'>('TODOS')
  const [filtroPeriodo, setFiltroPeriodo] = useState<PeriodoFiltroVisita>('TODOS')
  const [dataDe, setDataDe] = useState('')
  const [dataAte, setDataAte] = useState('')

  useEffect(() => {
    let ativo = true
    setCarregando(true)
    Promise.all([
      buscarEstudo(estudoId),
      listarVisitasAgendadas(
        estudoId,
        filtroStatus === 'TODOS' ? undefined : filtroStatus,
      ),
    ])
      .then(([dadosEstudo, listaVisitas]) => {
        if (!ativo) return
        setEstudo(dadosEstudo)
        setVisitas(listaVisitas)
        setErro('')
      })
      .catch((e) => {
        if (ativo) {
          setErro(`Não foi possível carregar a agenda do estudo. ${traduzirErro(e).message}`)
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [estudoId, filtroStatus])

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return visitas.filter((v) => {
      if (filtroStatus !== 'TODOS' && v.status !== filtroStatus) return false
      if (!atendeFiltroPeriodo(v, filtroPeriodo, dataDe, dataAte)) return false
      if (!termo) return true
      return [
        v.participante.nome,
        v.participante.email,
        v.visitaPrevista.nome,
        `D${v.visitaPrevista.diaPrevisto}`,
        v.local ?? '',
      ].some((valor) => valor.toLowerCase().includes(termo))
    })
  }, [visitas, busca, filtroStatus, filtroPeriodo, dataDe, dataAte])

  const indicadores = useMemo(() => {
    const total = visitas.length
    const agendadas = visitas.filter((v) => v.status === 'AGENDADA').length
    const realizadas = visitas.filter((v) => v.status === 'REALIZADA').length
    const ausentesOuCanceladas = visitas.filter(
      (v) => v.status === 'AUSENTE' || v.status === 'CANCELADA',
    ).length
    const foraJanela = visitas.filter((v) => v.foraDaJanela).length
    return { total, agendadas, realizadas, ausentesOuCanceladas, foraJanela }
  }, [visitas])

  const temFiltroAtivo =
    busca.trim() !== '' ||
    filtroStatus !== 'TODOS' ||
    filtroPeriodo !== 'TODOS' ||
    dataDe !== '' ||
    dataAte !== ''

  function limparFiltros() {
    setBusca('')
    setFiltroStatus('TODOS')
    setFiltroPeriodo('TODOS')
    setDataDe('')
    setDataAte('')
  }

  const encerrado = estudo?.estado === 'ENCERRADO'

  return (
    <div className="pagina">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / {estudo?.titulo ?? 'Estudo'} / Agenda do estudo
      </nav>

      <AbasEstudo estudoId={estudoId} ativa="agenda" />

      <div className="pagina__cabecalho">
        <div>
          <div className="titulo-com-selo">
            <h1>Agenda do estudo</h1>
            {estudo && (
              <span className={`selo selo--${estudo.estado.toLowerCase()}`}>
                {ROTULO_ESTADO[estudo.estado]}
              </span>
            )}
          </div>
          <p className="pagina__subtitulo">
            Cronograma e acompanhamento das visitas agendadas dos participantes incluídos no estudo.
          </p>
        </div>

        {!encerrado ? (
          <Link to={`/estudos/${estudoId}/agenda/novo`} className="botao botao--primario">
            + Agendar visita
          </Link>
        ) : (
          <button type="button" className="botao botao--primario" disabled>
            + Agendar visita
          </button>
        )}
      </div>

      {!carregando && visitas.length > 0 && (
        <section className="agenda-indicadores" aria-label="Resumo da agenda">
          <div className="cartao agenda-indicador">
            <small>Total na agenda</small>
            <strong>{indicadores.total}</strong>
            <span className="agenda-indicador__detalhe">
              {indicadores.foraJanela > 0
                ? `${indicadores.foraJanela} fora da janela ideal`
                : 'Todas dentro da janela'}
            </span>
          </div>
          <div className="cartao agenda-indicador">
            <small>Agendadas</small>
            <strong>{indicadores.agendadas}</strong>
            <span className="agenda-indicador__detalhe">Aguardando comparecimento</span>
          </div>
          <div className="cartao agenda-indicador">
            <small>Realizadas</small>
            <strong>{indicadores.realizadas}</strong>
            <span className="agenda-indicador__detalhe">Comparecimento confirmado</span>
          </div>
          <div className="cartao agenda-indicador">
            <small>Ausentes / Canceladas</small>
            <strong>{indicadores.ausentesOuCanceladas}</strong>
            <span className="agenda-indicador__detalhe">Exigem acompanhamento</span>
          </div>
        </section>
      )}

      <section className="cartao agenda-filtros" aria-label="Filtros da agenda">
        <div className="agenda-filtros__linha">
          <input
            className="pn-campo__entrada filtros__busca"
            type="search"
            placeholder="Buscar por participante, e-mail ou visita prevista"
            aria-label="Buscar por participante, e-mail ou visita prevista"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            className="pn-campo__entrada agenda-filtros__periodo"
            aria-label="Filtrar por período"
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value as PeriodoFiltroVisita)}
          >
            {FILTROS_PERIODO.map((p) => (
              <option key={p} value={p}>
                {ROTULO_PERIODO_VISITA[p]}
              </option>
            ))}
          </select>

          <div className="agenda-filtros__datas">
            <input
              type="date"
              className="pn-campo__entrada"
              aria-label="Data inicial do período"
              value={dataDe}
              onChange={(e) => setDataDe(e.target.value)}
            />
            <span style={{ fontSize: '11px', color: 'var(--texto-suave)' }}>até</span>
            <input
              type="date"
              className="pn-campo__entrada"
              aria-label="Data final do período"
              value={dataAte}
              onChange={(e) => setDataAte(e.target.value)}
            />
          </div>
        </div>

        <div className="agenda-filtros__linha">
          <div className="chips" role="group" aria-label="Filtrar por status da visita">
            {FILTROS_STATUS.map((s) => (
              <button
                key={s}
                type="button"
                className={s === filtroStatus ? 'chip chip--ativo' : 'chip'}
                aria-pressed={s === filtroStatus}
                onClick={() => {
                  if (s === filtroStatus) return
                  setFiltroStatus(s)
                }}
              >
                {s === 'TODOS' ? 'Todas' : ROTULO_STATUS_VISITA[s]}
              </button>
            ))}
          </div>

          {temFiltroAtivo && (
            <button
              type="button"
              className="botao botao--contorno botao--pequeno"
              onClick={limparFiltros}
            >
              Limpar filtros
            </button>
          )}
        </div>
      </section>

      {erro && (
        <div className="aviso aviso--erro" role="alert">
          {erro}
        </div>
      )}

      {/* Estado carregando (R2-08) */}
      {carregando && (
        <section className="cartao agenda-estado" role="status" aria-live="polite">
          <div className="agenda-estado__icone" aria-hidden="true">
            ⌛
          </div>
          <h2>Carregando agenda do estudo…</h2>
          <p>
            Buscando as visitas agendadas, janelas do protocolo e status de comparecimento dos participantes.
          </p>
          <div className="agenda-skeleton" aria-hidden="true">
            <div className="agenda-skeleton__linha" />
            <div className="agenda-skeleton__linha" />
            <div className="agenda-skeleton__linha" />
          </div>
        </section>
      )}

      {/* Estado vazio (R2-07) */}
      {!carregando && filtradas.length === 0 && (
        <section className="cartao agenda-estado" role="status">
          <div className="agenda-estado__icone" aria-hidden="true">
            📅
          </div>
          <h2>Nenhuma visita agendada encontrada</h2>
          <p>
            {temFiltroAtivo
              ? 'Nenhuma visita corresponde aos filtros selecionados. Tente limpar os filtros ou ajustar o período de busca.'
              : 'Este estudo ainda não possui visitas agendadas para os participantes incluídos. Comece agendando a primeira visita prevista do protocolo.'}
          </p>
          <div className="agenda-estado__acoes">
            {temFiltroAtivo && (
              <button type="button" className="botao botao--contorno" onClick={limparFiltros}>
                Limpar filtros
              </button>
            )}
            {!encerrado && (
              <Link to={`/estudos/${estudoId}/agenda/novo`} className="botao botao--primario">
                + Agendar primeira visita
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Tabela da agenda (R2-01) */}
      {!carregando && filtradas.length > 0 && (
        <>
          <div className="cartao cartao--tabela">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Visita prevista</th>
                  <th>Data e hora</th>
                  <th>Janela do protocolo</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtradas.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.participante.nome}</strong>
                      <small>{v.participante.email}</small>
                    </td>
                    <td>
                      <strong>{v.visitaPrevista.nome}</strong>
                      <small>
                        Dia D{v.visitaPrevista.diaPrevisto}
                        {v.visitaPrevista.janelaDias !== null
                          ? ` (± ${v.visitaPrevista.janelaDias} dias)`
                          : ''}
                      </small>
                    </td>
                    <td>
                      <strong>
                        {isoParaBR(v.dataAgendada)} às {v.horaAgendada}
                      </strong>
                      {v.foraDaJanela && (
                        <span className="selo selo--fora-janela">Fora da janela</span>
                      )}
                      {v.local && <small>{v.local}</small>}
                    </td>
                    <td>
                      {v.janelaInicio && v.janelaFim ? (
                        <>
                          <span>
                            {isoParaBR(v.janelaInicio)} a {isoParaBR(v.janelaFim)}
                          </span>
                          {v.dataSugerida && (
                            <small>Sugerida: {isoParaBR(v.dataSugerida)}</small>
                          )}
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <span className={`selo selo--visita-${v.status.toLowerCase()}`}>
                        {ROTULO_STATUS_VISITA[v.status]}
                      </span>
                      {v.status === 'CANCELADA' && v.motivoCancelamento && (
                        <small>Motivo: {v.motivoCancelamento}</small>
                      )}
                    </td>
                    <td className="tabela__acao">
                      {podeAlterarEstadoVisita ? (
                        <span className="tabela__acoes">
                          <Link
                            to={`/estudos/${estudoId}/agenda/${v.id}/acoes`}
                            className="link"
                            aria-label={`Registrar ação na visita de ${v.participante.nome}`}
                          >
                            {v.status === 'AGENDADA' ? 'Registrar ação' : 'Ver registro'}
                          </Link>
                        </span>
                      ) : (
                        <span className="pn-campo__dica">Somente consulta</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="contagem">
            Mostrando {filtradas.length} de {visitas.length} visitas agendadas
          </p>
        </>
      )}

      <footer className="pagina__rodape">
        <Link to="/estudos" className="botao botao--contorno">
          Voltar aos estudos
        </Link>
      </footer>
    </div>
  )
}
