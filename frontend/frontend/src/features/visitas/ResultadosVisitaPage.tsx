import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import '../../estilos/visitas.css'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAutorizacao } from '../auth/useAutorizacao'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import { dataHoraBR } from './datas'
import { ROTULO_STATUS_VISITA, type ItemResultado, type ResultadosVisita, type Visita } from './tipos'
import { buscarVisita, listarResultados, registrarResultados, traduzirErro } from './visitasService'

// RF14 (T-95): resultados das atividades de uma visita realizada.
// Acessada pela agenda e pelo histórico do participante. O coordenador registra; pesquisador e administrador
// só consultam. O formulário só aparece para visita REALIZADA, como no backend (VISITA_NAO_REALIZADA).

interface Valor {
  resultado: string
  observacao: string
}

const LIMITE = 500

function valoresIniciais(itens: ItemResultado[]): Record<number, Valor> {
  const valores: Record<number, Valor> = {}
  for (const item of itens) {
    valores[item.atividadeId] = { resultado: item.resultado ?? '', observacao: item.observacao ?? '' }
  }
  return valores
}

function ordenar(itens: ItemResultado[]): ItemResultado[] {
  return [...itens].sort((a, b) => a.ordem - b.ordem)
}

function TabelaLeitura({ itens }: { itens: ItemResultado[] }) {
  return (
    <div className="cartao">
      <table className="tabela">
        <thead>
          <tr>
            <th>Atividade</th>
            <th>Resultado</th>
            <th>Observação</th>
            <th>Registrado</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.atividadeId}>
              <td>
                #{item.ordem} · {item.descricao}
              </td>
              <td>{item.resultado ?? <span className="tabela__suave">Não registrado</span>}</td>
              <td>{item.observacao || '—'}</td>
              <td>
                {item.registradoEm ? (
                  <>
                    {dataHoraBR(item.registradoEm)}
                    {item.registradoPor && <small>por {item.registradoPor}</small>}
                  </>
                ) : (
                  '—'
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ResultadosVisitaPage() {
  const { estudoId, visitaId } = useParams<{ estudoId: string; visitaId: string }>()
  const idEstudo = Number(estudoId)
  const idVisita = Number(visitaId)
  const navegar = useNavigate()
  const { pode } = useAutorizacao()
  const podeRegistrar = pode('registrarResultados')

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [visita, setVisita] = useState<Visita | null>(null)
  const [resultados, setResultados] = useState<ResultadosVisita | null>(null)
  const [valores, setValores] = useState<Record<number, Valor>>({})
  const [errosCampos, setErrosCampos] = useState<Record<number, string>>({})

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroCarga, setErroCarga] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([buscarEstudo(idEstudo), listarResultados(idVisita)])
      .then(([dadosEstudo, dadosResultados]) => {
        if (!ativo) return
        setEstudo(dadosEstudo)
        setResultados(dadosResultados)
        setValores(valoresIniciais(dadosResultados.itens))
      })
      .catch((e) => {
        if (ativo) setErroCarga(`Não foi possível carregar os resultados. ${traduzirErro(e).message}`)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    // Participante e data da visita: só o coordenador pode consultar a visita. É um extra: se falhar,
    // o cabeçalho fica só com o estudo e o status.
    if (podeRegistrar) {
      buscarVisita(idVisita)
        .then((dados) => {
          if (ativo) setVisita(dados)
        })
        .catch(() => {})
    }
    return () => {
      ativo = false
    }
  }, [idEstudo, idVisita, podeRegistrar])

  function mudar(atividadeId: number, campo: keyof Valor, valor: string) {
    setValores((atuais) => ({
      ...atuais,
      [atividadeId]: { ...(atuais[atividadeId] ?? { resultado: '', observacao: '' }), [campo]: valor },
    }))
    if (campo === 'resultado' && valor.trim()) {
      setErrosCampos((atuais) => {
        const { [atividadeId]: _removido, ...resto } = atuais
        return resto
      })
    }
    setSucesso('')
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (!resultados) return
    setErro('')
    setSucesso('')

    const faltantes: Record<number, string> = {}
    for (const item of resultados.itens) {
      if (!valores[item.atividadeId]?.resultado.trim()) faltantes[item.atividadeId] = 'Informe o resultado.'
    }
    setErrosCampos(faltantes)
    const quantos = Object.keys(faltantes).length
    if (quantos > 0) {
      setErro(
        `Informe o resultado de todas as atividades. ${
          quantos === 1 ? 'Falta 1 atividade.' : `Faltam ${quantos} atividades.`
        }`,
      )
      return
    }

    setSalvando(true)
    try {
      const salvos = await registrarResultados(idVisita, {
        itens: ordenar(resultados.itens).map((item) => ({
          atividadeId: item.atividadeId,
          resultado: valores[item.atividadeId].resultado.trim(),
          observacao: valores[item.atividadeId].observacao.trim() || null,
        })),
      })
      setResultados(salvos)
      setValores(valoresIniciais(salvos.itens))
      setSucesso('Resultados salvos com sucesso.')
    } catch (e) {
      setErro(`Não foi possível salvar os resultados. ${traduzirErro(e).message}`)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="pagina">
        <p>Carregando resultados…</p>
      </div>
    )
  }

  const itens = ordenar(resultados?.itens ?? [])
  const realizada = resultados?.status === 'REALIZADA'
  const encerrado = estudo?.estado === 'ENCERRADO'
  const editavel = podeRegistrar && realizada && !encerrado && itens.length > 0
  const titulo = visita ? `Resultados · ${visita.visitaPrevista.nome}` : 'Resultados da visita'

  return (
    <div className="pagina pagina--formulario">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / {estudo?.titulo ?? 'Estudo'} / Resultados da visita
      </nav>

      <div className="pagina__cabecalho">
        <div>
          <div className="titulo-com-selo">
            <h1>{titulo}</h1>
            {resultados && (
              <span className={`selo selo--visita-${resultados.status.toLowerCase()}`}>
                {ROTULO_STATUS_VISITA[resultados.status]}
              </span>
            )}
          </div>
          <p className="pagina__subtitulo">Resultados fictícios das atividades previstas para a visita.</p>
        </div>
      </div>

      {erroCarga && (
        <div className="aviso aviso--erro" role="alert">
          {erroCarga}
        </div>
      )}

      {resultados && (
        <>
          <div className="cartao dados-candidato">
            {visita && (
              <>
                <div>
                  <small>Participante</small>
                  <strong>{visita.participante.nome}</strong>
                </div>
                <div>
                  <small>Data da visita</small>
                  <strong>{dataHoraBR(visita.dataHora)}</strong>
                </div>
              </>
            )}
            <div>
              <small>Estudo</small>
              <strong>{estudo?.titulo ?? '—'}</strong>
            </div>
            <div>
              <small>Atividades</small>
              <strong>{itens.length}</strong>
            </div>
          </div>

          {!realizada && (
            <div className="aviso aviso--atencao" role="status">
              <strong>Visita {ROTULO_STATUS_VISITA[resultados.status].toLowerCase()}.</strong> Os resultados só
              podem ser registrados depois que a visita for marcada como realizada.
            </div>
          )}
          {realizada && podeRegistrar && encerrado && (
            <div className="aviso aviso--atencao" role="status">
              <strong>Estudo encerrado.</strong> Os resultados podem ser consultados, mas não alterados.
            </div>
          )}
          {realizada && !podeRegistrar && (
            <div className="aviso aviso--info" role="status">
              <strong>Modo leitura.</strong> Só o coordenador registra os resultados.
            </div>
          )}
          {realizada && itens.length === 0 && (
            <p className="pn-campo__dica">A visita prevista não tem atividades cadastradas.</p>
          )}

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

          {editavel && (
            <form className="cartao formulario" onSubmit={enviar} noValidate>
              <fieldset className="formulario__campos" disabled={salvando}>
                {itens.map((item) => {
                  const valor = valores[item.atividadeId] ?? { resultado: '', observacao: '' }
                  const erroCampo = errosCampos[item.atividadeId]
                  const idErro = `erro-resultado-${item.atividadeId}`
                  return (
                    <div key={item.atividadeId} className="item-avaliacao">
                      <span className="item-avaliacao__descricao">
                        #{item.ordem} · {item.descricao}
                      </span>
                      <div className="resultado__campos">
                        <label className="pn-campo">
                          <span className="pn-campo__rotulo">Resultado *</span>
                          <input
                            className={erroCampo ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'}
                            aria-label={`Resultado de ${item.descricao}`}
                            aria-invalid={erroCampo ? true : undefined}
                            aria-describedby={erroCampo ? idErro : undefined}
                            maxLength={LIMITE}
                            placeholder="Ex.: PA 120x80"
                            value={valor.resultado}
                            onChange={(e) => mudar(item.atividadeId, 'resultado', e.target.value)}
                          />
                          {erroCampo && (
                            <span id={idErro} className="pn-campo__erro">
                              {erroCampo}
                            </span>
                          )}
                        </label>
                        <label className="pn-campo">
                          <span className="pn-campo__rotulo">Observação</span>
                          <input
                            className="pn-campo__entrada"
                            aria-label={`Observação de ${item.descricao}`}
                            maxLength={LIMITE}
                            placeholder="Opcional"
                            value={valor.observacao}
                            onChange={(e) => mudar(item.atividadeId, 'observacao', e.target.value)}
                          />
                        </label>
                      </div>
                      {item.registradoEm && (
                        <small className="pn-campo__dica">
                          Último registro em {dataHoraBR(item.registradoEm)}
                          {item.registradoPor ? ` por ${item.registradoPor}` : ''}
                        </small>
                      )}
                    </div>
                  )
                })}
              </fieldset>

              <footer className="formulario__rodape">
                <small>Salvar substitui os resultados já registrados destas atividades.</small>
                <div className="formulario__acoes">
                  <button type="submit" className="botao botao--primario" disabled={salvando}>
                    {salvando ? 'Salvando…' : 'Salvar resultados'}
                  </button>
                </div>
              </footer>
            </form>
          )}

          {realizada && !editavel && itens.length > 0 && <TabelaLeitura itens={itens} />}
        </>
      )}

      <footer className="pagina__rodape">
        <button type="button" className="botao botao--contorno" onClick={() => navegar(-1)}>
          Voltar
        </button>
      </footer>
    </div>
  )
}
