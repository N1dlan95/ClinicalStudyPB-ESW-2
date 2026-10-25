import '../../estilos/estudos.css'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAutorizacao } from '../auth/useAutorizacao'
import { isoParaBR } from './datas'
import { listarEstudos } from './estudosService'
import { ROTULO_STATUS, type Estudo, type StatusEstudo } from './tipos'

function BarraOcupacao({ incluidos, limite }: { incluidos: number; limite: number }) {
  const lotado = limite > 0 && incluidos >= limite
  const percentual = limite > 0 ? Math.min(100, Math.round((incluidos / limite) * 100)) : 0
  return (
    <div className="ocupacao">
      <span className={lotado ? 'ocupacao__texto ocupacao__texto--lotado' : 'ocupacao__texto'}>
        {incluidos} de {limite}
        {lotado && ' · lotado'}
      </span>
      <div className="barra">
        <div
          className={lotado ? 'barra__preenchida barra__preenchida--lotado' : 'barra__preenchida'}
          style={{ width: `${percentual}%` }}
        />
      </div>
    </div>
  )
}

export function EstudosListaPage() {
  const { pode } = useAutorizacao()
  const [estudos, setEstudos] = useState<Estudo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<StatusEstudo | 'todos'>('todos')

  useEffect(() => {
    let ativo = true
    listarEstudos()
      .then((dados) => {
        if (ativo) setEstudos(dados)
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar os estudos. Verifique sua conexão.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return estudos.filter((e) => {
      if (filtroStatus !== 'todos' && e.status !== filtroStatus) return false
      if (!termo) return true
      return [e.titulo, e.codigoProtocolo, e.pesquisadorNome].some((campo) =>
        campo.toLowerCase().includes(termo),
      )
    })
  }, [estudos, busca, filtroStatus])

  return (
    <div className="pagina">
      <div className="pagina__cabecalho">
        <div>
          <h1>Estudos</h1>
          <p className="pagina__subtitulo">
            Estudos clínicos cadastrados, responsável e ocupação de vagas.
          </p>
        </div>
        {pode('criarEstudos') && (
          <Link to="/estudos/novo" className="botao botao--primario">
            + Novo estudo
          </Link>
        )}
      </div>

      <div className="filtros">
        <input
          className="pn-campo__entrada filtros__busca"
          type="search"
          placeholder="Buscar por título, protocolo ou responsável"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="pn-campo__entrada filtros__status"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as StatusEstudo | 'todos')}
        >
          <option value="todos">Todos os status</option>
          {(Object.keys(ROTULO_STATUS) as StatusEstudo[]).map((status) => (
            <option key={status} value={status}>
              {ROTULO_STATUS[status]}
            </option>
          ))}
        </select>
      </div>

      {erro && <div className="aviso aviso--erro">{erro}</div>}

      <div className="cartao cartao--tabela">
        <table className="tabela">
          <thead>
            <tr>
              <th>Estudo</th>
              <th>Responsável</th>
              <th>Período</th>
              <th>Participantes</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((estudo) => (
              <tr key={estudo.id}>
                <td>
                  <strong>{estudo.titulo}</strong>
                  <small>Protocolo {estudo.codigoProtocolo}</small>
                </td>
                <td>{estudo.pesquisadorNome}</td>
                <td>
                  {isoParaBR(estudo.dataInicio)} – {isoParaBR(estudo.dataTermino)}
                </td>
                <td>
                  <BarraOcupacao
                    incluidos={estudo.participantesIncluidos}
                    limite={estudo.limiteParticipantes}
                  />
                </td>
                <td>
                  <span className={`selo selo--${estudo.status}`}>{ROTULO_STATUS[estudo.status]}</span>
                </td>
                <td className="tabela__acao">
                  {pode('editarEstudos') && (
                    <Link to={`/estudos/${estudo.id}/editar`} className="link">
                      Editar
                    </Link>
                  )}
                </td>
              </tr>
            ))}
            {!carregando && filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="tabela__vazia">
                  Nenhum estudo encontrado.
                </td>
              </tr>
            )}
            {carregando && (
              <tr>
                <td colSpan={6} className="tabela__vazia">
                  Carregando estudos…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!carregando && (
        <p className="contagem">
          Mostrando {filtrados.length} de {estudos.length} estudos
        </p>
      )}
    </div>
  )
}
