import '../../estilos/estudos.css'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAutorizacao } from '../auth/useAutorizacao'
import { AbasEstudo } from './AbasEstudo'
import {
  atualizarCriterio,
  buscarEstudo,
  criarCriterio,
  listarCriterios,
  removerCriterio,
  traduzirErro,
} from './estudosService'
import {
  ROTULO_ESTADO,
  ROTULO_TIPO_CRITERIO,
  type Criterio,
  type Estudo,
  type TipoCriterio,
} from './tipos'

interface ErrosCriterio {
  descricao?: string
  ordem?: string
}

function validarFormulario(descricao: string, ordemTexto: string): ErrosCriterio {
  const erros: ErrosCriterio = {}
  const texto = descricao.trim()
  if (!texto) {
    erros.descricao = 'Informe a descrição do critério.'
  } else if (texto.length < 3) {
    erros.descricao = 'A descrição deve ter pelo menos 3 caracteres.'
  }
  if (ordemTexto.trim()) {
    const numero = Number(ordemTexto)
    if (!Number.isInteger(numero) || numero <= 0) {
      erros.ordem = 'A ordem deve ser um número inteiro maior que zero.'
    }
  }
  return erros
}

function TabelaCriterios({
  titulo,
  subtitulo,
  tipo,
  itens,
  podeEditar,
  aoEditar,
  aoRemover,
}: {
  titulo: string
  subtitulo: string
  tipo: TipoCriterio
  itens: Criterio[]
  podeEditar: boolean
  aoEditar: (criterio: Criterio) => void
  aoRemover: (criterio: Criterio) => void
}) {
  return (
    <section className="cartao cartao--tabela" aria-label={titulo}>
      <header className="cabecalho-cartao">
        <div>
          <h2>{titulo}</h2>
          <small>{subtitulo}</small>
        </div>
        <span className={`selo selo--${tipo.toLowerCase()}`}>{ROTULO_TIPO_CRITERIO[tipo]}</span>
      </header>
      <table className="tabela">
        <thead>
          <tr>
            <th style={{ width: '70px' }}>Ordem</th>
            <th>Descrição</th>
            {podeEditar && <th style={{ width: '140px' }} />}
          </tr>
        </thead>
        <tbody>
          {itens.map((criterio) => (
            <tr key={criterio.id}>
              <td>
                <strong>#{criterio.ordem}</strong>
              </td>
              <td>{criterio.descricao}</td>
              {podeEditar && (
                <td className="tabela__acao">
                  <span className="formulario__acoes" style={{ justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="link"
                      style={{ background: 'none', border: 0, cursor: 'pointer', font: 'inherit' }}
                      onClick={() => aoEditar(criterio)}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="link"
                      style={{
                        background: 'none',
                        border: 0,
                        cursor: 'pointer',
                        font: 'inherit',
                        color: 'var(--erro)',
                      }}
                      onClick={() => aoRemover(criterio)}
                    >
                      Remover
                    </button>
                  </span>
                </td>
              )}
            </tr>
          ))}
          {itens.length === 0 && (
            <tr>
              <td colSpan={podeEditar ? 3 : 2} className="tabela__vazia">
                Nenhum critério de {ROTULO_TIPO_CRITERIO[tipo].toLowerCase()} cadastrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  )
}

export function CriteriosPage() {
  const { id } = useParams<{ id: string }>()
  const estudoId = Number(id)
  const { pode } = useAutorizacao()

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [criterios, setCriterios] = useState<Criterio[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  const [editandoId, setEditandoId] = useState<number | null>(null)
  const [tipo, setTipo] = useState<TipoCriterio>('INCLUSAO')
  const [descricao, setDescricao] = useState('')
  const [ordem, setOrdem] = useState('')

  const [erros, setErros] = useState<ErrosCriterio>({})
  const [mensagemErro, setMensagemErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const emPlanejamento = estudo?.estado === 'PLANEJAMENTO'
  const podeEditar = pode('editarEstudos') && Boolean(emPlanejamento)

  useEffect(() => {
    let ativo = true
    Promise.all([buscarEstudo(estudoId), listarCriterios(estudoId)])
      .then(([dadosEstudo, lista]) => {
        if (!ativo) return
        setEstudo(dadosEstudo)
        setCriterios(lista)
      })
      .catch((erro) => {
        if (ativo) {
          setMensagemErro(`Não foi possível carregar os critérios. ${traduzirErro(erro).message}`)
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [estudoId])

  const inclusao = useMemo(
    () => criterios.filter((c) => c.tipo === 'INCLUSAO').sort((a, b) => a.ordem - b.ordem),
    [criterios],
  )
  const exclusao = useMemo(
    () => criterios.filter((c) => c.tipo === 'EXCLUSAO').sort((a, b) => a.ordem - b.ordem),
    [criterios],
  )

  function limparFormulario() {
    setEditandoId(null)
    setTipo('INCLUSAO')
    setDescricao('')
    setOrdem('')
    setErros({})
  }

  function iniciarEdicao(criterio: Criterio) {
    setEditandoId(criterio.id)
    setTipo(criterio.tipo)
    setDescricao(criterio.descricao)
    setOrdem(String(criterio.ordem))
    setErros({})
    setMensagemErro('')
    setSucesso('')
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setMensagemErro('')
    setSucesso('')

    const encontrados = validarFormulario(descricao, ordem)
    setErros(encontrados)
    if (Object.keys(encontrados).length > 0) return

    const dados = {
      tipo,
      descricao: descricao.trim(),
      ordem: ordem.trim() ? Number(ordem) : null,
    }

    setSalvando(true)
    try {
      if (editandoId !== null) {
        await atualizarCriterio(estudoId, editandoId, dados)
        setSucesso('Critério atualizado com sucesso.')
      } else {
        await criarCriterio(estudoId, dados)
        setSucesso('Critério cadastrado com sucesso.')
      }
      setCriterios(await listarCriterios(estudoId))
      limparFormulario()
    } catch (erro) {
      setMensagemErro(`Não foi possível salvar o critério. ${traduzirErro(erro).message}`)
    } finally {
      setSalvando(false)
    }
  }

  async function confirmarRemocao(criterio: Criterio) {
    setMensagemErro('')
    setSucesso('')
    try {
      await removerCriterio(estudoId, criterio.id)
      setCriterios((atuais) => atuais.filter((item) => item.id !== criterio.id))
      if (editandoId === criterio.id) limparFormulario()
      setSucesso('Critério removido com sucesso.')
    } catch (erro) {
      setMensagemErro(`Não foi possível remover o critério. ${traduzirErro(erro).message}`)
    }
  }

  if (carregando) {
    return (
      <div className="pagina">
        <p>Carregando critérios…</p>
      </div>
    )
  }

  return (
    <div className="pagina">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / {estudo?.titulo ?? 'Estudo'} / Critérios de elegibilidade
      </nav>

      <AbasEstudo estudoId={estudoId} ativa="criterios" />

      <div className="pagina__cabecalho">
        <div>
          <div className="titulo-com-selo">
            <h1>Critérios de elegibilidade</h1>
            {estudo && (
              <span className={`selo selo--${estudo.estado.toLowerCase()}`}>
                {ROTULO_ESTADO[estudo.estado]}
              </span>
            )}
          </div>
          <p className="pagina__subtitulo">
            Condições de inclusão e exclusão verificadas na triagem dos candidatos do estudo.
          </p>
        </div>
      </div>

      {estudo && !emPlanejamento && (
        <div className="aviso aviso--atencao" role="status">
          <strong>Estudo fora de planejamento.</strong> Os critérios de elegibilidade só podem ser
          cadastrados, editados ou removidos enquanto o estudo está em Planejamento.
        </div>
      )}

      {mensagemErro && (
        <div className="aviso aviso--erro" role="alert">
          {mensagemErro}
        </div>
      )}
      {sucesso && (
        <div className="aviso aviso--sucesso" role="status">
          {sucesso}
        </div>
      )}

      {pode('editarEstudos') && (
        <form className="cartao formulario" onSubmit={enviar} noValidate>
          <fieldset className="formulario__campos" disabled={!podeEditar || salvando}>
            <section>
              <h2>{editandoId !== null ? 'Editar critério' : 'Novo critério'}</h2>
              <div className="formulario__grade">
                <label className="pn-campo">
                  <span className="pn-campo__rotulo">Tipo de critério *</span>
                  <select
                    className="pn-campo__entrada"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value as TipoCriterio)}
                  >
                    <option value="INCLUSAO">Inclusão (candidato deve atender)</option>
                    <option value="EXCLUSAO">Exclusão (impede a participação)</option>
                  </select>
                </label>

                <label className="pn-campo">
                  <span className="pn-campo__rotulo">Ordem</span>
                  <input
                    className={
                      erros.ordem ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'
                    }
                    placeholder="Automática se em branco"
                    inputMode="numeric"
                    value={ordem}
                    onChange={(e) => {
                      setOrdem(e.target.value.replace(/\D/g, ''))
                      setErros((atuais) => ({ ...atuais, ordem: undefined }))
                    }}
                  />
                  {erros.ordem ? (
                    <span className="pn-campo__erro">{erros.ordem}</span>
                  ) : (
                    <span className="pn-campo__dica">
                      Opcional. Quando vazia, o critério entra no fim da lista do tipo.
                    </span>
                  )}
                </label>
              </div>

              <label className="pn-campo" style={{ marginTop: '8px' }}>
                <span className="pn-campo__rotulo">Descrição do critério *</span>
                <input
                  className={
                    erros.descricao ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'
                  }
                  placeholder="Ex.: Idade entre 18 e 65 anos na data da inclusão"
                  maxLength={500}
                  value={descricao}
                  onChange={(e) => {
                    setDescricao(e.target.value)
                    setErros((atuais) => ({ ...atuais, descricao: undefined }))
                  }}
                />
                {erros.descricao ? (
                  <span className="pn-campo__erro">{erros.descricao}</span>
                ) : (
                  <span className="pn-campo__dica">Entre 3 e 500 caracteres.</span>
                )}
              </label>
            </section>
          </fieldset>

          <footer className="formulario__rodape">
            <small>* Campos obrigatórios</small>
            <div className="formulario__acoes">
              {editandoId !== null && (
                <button type="button" className="botao botao--contorno" onClick={limparFormulario}>
                  Cancelar edição
                </button>
              )}
              <button type="submit" className="botao botao--primario" disabled={!podeEditar || salvando}>
                {salvando
                  ? 'Salvando…'
                  : editandoId !== null
                    ? 'Salvar critério'
                    : '+ Adicionar critério'}
              </button>
            </div>
          </footer>
        </form>
      )}

      <div className="grade-criterios">
        <TabelaCriterios
          titulo="Critérios de inclusão"
          subtitulo="Condições obrigatórias que o candidato deve apresentar."
          tipo="INCLUSAO"
          itens={inclusao}
          podeEditar={podeEditar}
          aoEditar={iniciarEdicao}
          aoRemover={confirmarRemocao}
        />
        <TabelaCriterios
          titulo="Critérios de exclusão"
          subtitulo="Condições que tornam o candidato inelegível se presentes."
          tipo="EXCLUSAO"
          itens={exclusao}
          podeEditar={podeEditar}
          aoEditar={iniciarEdicao}
          aoRemover={confirmarRemocao}
        />
      </div>

      <footer className="pagina__rodape">
        <Link to="/estudos" className="botao botao--contorno">
          Voltar aos estudos
        </Link>
      </footer>
    </div>
  )
}
