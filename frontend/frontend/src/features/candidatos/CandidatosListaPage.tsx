import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isoParaBR } from '../estudos/datas'
import { buscarEstudo } from '../estudos/estudosService'
import { ROTULO_ESTADO, type Estudo } from '../estudos/tipos'
import { contarIncluidos, incluirCandidato, listarCandidatos, traduzirErro } from './candidatosService'
import { ConfirmacaoDialogo } from './ConfirmacaoDialogo'
import { ContadorVagas } from './ContadorVagas'
import { bloqueioInclusao, mensagemErroInclusao } from './inclusao'
import { dataConsentimento } from './consentimento'
import { ROTULO_STATUS_CANDIDATO, type Candidato, type StatusCandidato } from './tipos'

const FILTROS: (StatusCandidato | 'TODOS')[] = ['TODOS', 'CADASTRADO', 'ELEGIVEL', 'INELEGIVEL', 'INCLUIDO']

export function CandidatosListaPage() {
  const { estudoId } = useParams<{ estudoId: string }>()
  const idEstudo = Number(estudoId)
  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [filtro, setFiltro] = useState<StatusCandidato | 'TODOS'>('TODOS')
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [ocupadas, setOcupadas] = useState<number | null>(null)
  const [incluir, setIncluir] = useState<Candidato | null>(null)
  const [incluindo, setIncluindo] = useState(false)
  const [erroInclusao, setErroInclusao] = useState<{ titulo: string; texto: string } | null>(null)
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    let ativo = true
    buscarEstudo(idEstudo)
      .then((e) => {
        if (ativo) setEstudo(e)
      })
      .catch((e: Error) => {
        if (ativo) setErro(`Não foi possível carregar o estudo. ${e.message}`)
      })
    // O contador é um extra: se falhar, a tela mostra só o limite
    contarIncluidos(idEstudo)
      .then((n) => {
        if (ativo) setOcupadas(n)
      })
      .catch(() => {})
    return () => {
      ativo = false
    }
  }, [idEstudo])

  // O filtro por status vai para a API (?status=); a busca por texto é feita na tela
  useEffect(() => {
    let ativo = true
    listarCandidatos(idEstudo, filtro === 'TODOS' ? undefined : filtro)
      .then((dados) => {
        if (ativo) {
          setCandidatos(dados)
          setErro('')
        }
      })
      .catch((e: Error) => {
        if (ativo) setErro(`Não foi possível carregar os candidatos. ${e.message}`)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [idEstudo, filtro])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return candidatos
    return candidatos.filter((c) => [c.nome, c.email].some((v) => v.toLowerCase().includes(termo)))
  }, [candidatos, busca])

  async function confirmarInclusao() {
    if (!incluir) return
    const alvo = incluir
    setIncluindo(true)
    setErroInclusao(null)
    setSucesso('')
    try {
      const resultado = await incluirCandidato(alvo.id)
      setOcupadas(resultado.vagasOcupadas)
      setEstudo((e) => (e ? { ...e, limiteParticipantes: resultado.limiteParticipantes } : e))
      setCandidatos((lista) => lista.map((c) => (c.id === alvo.id ? { ...c, status: 'INCLUIDO' } : c)))
      setSucesso(
        `${alvo.nome} foi incluído(a) no estudo. Vagas ocupadas: ${resultado.vagasOcupadas} de ${resultado.limiteParticipantes}.`,
      )
    } catch (e) {
      setErroInclusao(mensagemErroInclusao(traduzirErro(e)))
    } finally {
      setIncluindo(false)
      setIncluir(null)
    }
  }

  // Cadastro só com o estudo em RECRUTAMENTO (regra da task 3558)
  const emRecrutamento = estudo?.estado === 'RECRUTAMENTO'

  return (
    <div className="pagina">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / {estudo?.titulo ?? 'Estudo'}
      </nav>
      <div className="pagina__cabecalho">
        <div>
          <h1>Candidatos</h1>
          <p className="pagina__subtitulo">Cadastro e acompanhamento dos candidatos do estudo.</p>
        </div>
        {emRecrutamento ? (
          <Link to={`/estudos/${idEstudo}/candidatos/novo`} className="botao botao--primario">
            + Novo candidato
          </Link>
        ) : (
          <button type="button" className="botao botao--primario" disabled>
            + Novo candidato
          </button>
        )}
      </div>

      {estudo && (
        <div className="lista__resumo">
        <div className="cartao resumo-estudo">
          <small>Estudo</small>
          <div className="resumo-estudo__titulo">
            <strong>{estudo.titulo}</strong>
            <span className={`selo selo--${estudo.estado.toLowerCase()}`}>{ROTULO_ESTADO[estudo.estado]}</span>
          </div>
          <small>
            Responsável: {estudo.responsavel.nome}
          </small>
        </div>
        <ContadorVagas ocupadas={ocupadas} limite={estudo.limiteParticipantes} />
        </div>
      )}

      {estudo && !emRecrutamento && (
        <div className="aviso aviso--atencao" role="status">
          <strong>Estudo fora de recrutamento.</strong> O estudo está em {ROTULO_ESTADO[estudo.estado]}. O
          cadastro de candidatos só fica liberado quando o estudo estiver em Recrutamento.
        </div>
      )}

      <div className="filtros">
        <input
          className="pn-campo__entrada filtros__busca"
          type="search"
          placeholder="Buscar por nome ou e-mail"
          aria-label="Buscar por nome ou e-mail"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <div className="chips" role="group" aria-label="Filtrar por status">
          {FILTROS.map((f) => (
            <button
              key={f}
              type="button"
              className={f === filtro ? 'chip chip--ativo' : 'chip'}
              aria-pressed={f === filtro}
              onClick={() => {
                if (f === filtro) return
                setCarregando(true)
                setFiltro(f)
              }}
            >
              {f === 'TODOS' ? 'Todos' : ROTULO_STATUS_CANDIDATO[f]}
            </button>
          ))}
        </div>
      </div>

      {erro && (
        <div className="aviso aviso--erro" role="alert">
          {erro}
        </div>
      )}
      {erroInclusao && (
        <div className="aviso aviso--erro" role="alert">
          <strong>{erroInclusao.titulo}.</strong> {erroInclusao.texto}
        </div>
      )}
      {sucesso && (
        <div className="aviso aviso--sucesso" role="status">
          {sucesso}
        </div>
      )}

      <div className="cartao cartao--tabela">
        <table className="tabela">
          <thead>
            <tr>
              <th>Candidato</th>
              <th>Nascimento</th>
              <th>Telefone</th>
              <th>Status</th>
              <th>Consentimento</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {!carregando &&
              filtrados.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.nome}</strong>
                    <small>{c.email}</small>
                  </td>
                  <td>{isoParaBR(c.dataNascimento)}</td>
                  <td>{c.telefone || '—'}</td>
                  <td>
                    <span className={`selo selo--candidato-${c.status.toLowerCase()}`}>
                      {ROTULO_STATUS_CANDIDATO[c.status]}
                    </span>
                  </td>
                  <td>
                    {c.consentimento ? (
                      `Registrado em ${dataConsentimento(c.consentimento.registradoEm)}`
                    ) : c.status === 'ELEGIVEL' ? (
                      <span className="consentimento-lista--pendente">Pendente</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="tabela__acao">
                    <span className="tabela__acoes">
                      <Link to={`/estudos/${idEstudo}/candidatos/${c.id}`} className="link">
                        Ver detalhes
                      </Link>
                      <Link to={`/estudos/${idEstudo}/candidatos/${c.id}/avaliacao`} className="link">
                        Avaliar
                      </Link>
                      {/* "Incluir" aparece para quem já pode ser incluído; com vagas esgotadas fica desabilitado */}
                      {(() => {
                        const bloqueio = bloqueioInclusao(c, estudo, ocupadas)
                        if (bloqueio !== null && bloqueio !== 'VAGAS_ESGOTADAS') return null
                        return (
                          <button
                            type="button"
                            className="botao botao--primario botao--pequeno"
                            disabled={bloqueio === 'VAGAS_ESGOTADAS'}
                            title={bloqueio === 'VAGAS_ESGOTADAS' ? 'Vagas esgotadas' : undefined}
                            aria-label={`Incluir ${c.nome}`}
                            onClick={() => setIncluir(c)}
                          >
                            Incluir
                          </button>
                        )
                      })()}
                    </span>
                  </td>
                </tr>
              ))}
            {!carregando && filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="tabela__vazia">
                  Nenhum candidato encontrado.
                </td>
              </tr>
            )}
            {carregando && (
              <tr>
                <td colSpan={6} className="tabela__vazia">
                  Carregando candidatos…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {incluir && (
        <ConfirmacaoDialogo
          titulo="Incluir no estudo?"
          rotuloConfirmar="Confirmar inclusão"
          rotuloConfirmando="Incluindo…"
          confirmando={incluindo}
          aoConfirmar={confirmarInclusao}
          aoCancelar={() => setIncluir(null)}
        >
          <p className="cartao__texto">
            {incluir.nome} vai ocupar uma vaga
            {estudo && ocupadas !== null ? ` (${ocupadas + 1} de ${estudo.limiteParticipantes} depois da inclusão)` : ''}{' '}
            e passa a participar do estudo.
          </p>
        </ConfirmacaoDialogo>
      )}

      {!carregando && (
        <p className="contagem">
          Mostrando {filtrados.length} de {candidatos.length} candidatos
        </p>
      )}

      <footer className="pagina__rodape">
        <Link to="/estudos" className="botao botao--contorno">
          Voltar aos estudos
        </Link>
      </footer>
    </div>
  )
}
