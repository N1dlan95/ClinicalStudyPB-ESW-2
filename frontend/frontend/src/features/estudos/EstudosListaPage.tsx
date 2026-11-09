import '../../estilos/estudos.css'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAutorizacao } from '../auth/useAutorizacao'
import { isoParaBR } from './datas'
import { listarEstudos } from './estudosService'
import { ROTULO_ESTADO, type EstadoEstudo, type Estudo } from './tipos'

export function EstudosListaPage() {
  const { pode } = useAutorizacao()
  const [estudos, setEstudos] = useState<Estudo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<EstadoEstudo | 'todos'>('todos')

  useEffect(() => {
    let ativo = true
    listarEstudos()
      .then((dados) => {
        if (ativo) setEstudos(dados)
      })
      .catch((e: Error) => {
        if (ativo) setErro(`Não foi possível carregar os estudos. ${e.message}`)
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
      if (filtroStatus !== 'todos' && e.estado !== filtroStatus) return false
      if (!termo) return true
      return [e.titulo, e.objetivo, e.responsavel.nome].some((campo) =>
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
            Estudos clínicos cadastrados, responsável, período e limite de vagas.
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
          placeholder="Buscar por título, objetivo ou responsável"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="pn-campo__entrada filtros__status"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as EstadoEstudo | 'todos')}
        >
          <option value="todos">Todos os estados</option>
          {(Object.keys(ROTULO_ESTADO) as EstadoEstudo[]).map((estado) => (
            <option key={estado} value={estado}>
              {ROTULO_ESTADO[estado]}
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
              <th>Vagas</th>
              <th>Estado</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((estudo) => (
              <tr key={estudo.id}>
                <td>
                  <strong>{estudo.titulo}</strong>
                  <small className="tabela__resumo">{estudo.objetivo}</small>
                </td>
                <td>{estudo.responsavel.nome}</td>
                <td>
                  {isoParaBR(estudo.dataInicio)} – {estudo.dataFim ? isoParaBR(estudo.dataFim) : 'sem data'}
                </td>
                <td>
                  {estudo.limiteParticipantes} {estudo.limiteParticipantes === 1 ? 'vaga' : 'vagas'}
                </td>
                <td>
                  <span className={`selo selo--${estudo.estado.toLowerCase()}`}>{ROTULO_ESTADO[estudo.estado]}</span>
                </td>
                <td className="tabela__acao">
                  <span className="formulario__acoes" style={{ justifyContent: 'flex-end' }}>
                    {pode('gerenciarCandidatos') && (
                      <Link to={`/estudos/${estudo.id}/candidatos`} className="link">
                        Candidatos
                      </Link>
                    )}
                    {pode('editarEstudos') && (
                      <>
                        <Link to={`/estudos/${estudo.id}/criterios`} className="link">
                          Critérios
                        </Link>
                        <Link to={`/estudos/${estudo.id}/visitas-previstas`} className="link">
                          Visitas
                        </Link>
                        <Link to={`/estudos/${estudo.id}/estado`} className="link">
                          Estado
                        </Link>
                      </>
                    )}
                    {/* Estudo encerrado não pode ser editado (openapi.yaml, PUT /estudos/{id}) */}
                    {pode('editarEstudos') && estudo.estado !== 'ENCERRADO' && (
                      <Link to={`/estudos/${estudo.id}/editar`} className="link">
                        Editar
                      </Link>
                    )}
                  </span>
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
