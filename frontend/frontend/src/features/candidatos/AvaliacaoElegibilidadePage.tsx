import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isoParaBR } from '../estudos/datas'
import { buscarEstudo } from '../estudos/estudosService'
import { ROTULO_ESTADO, type Estudo } from '../estudos/tipos'
import {
  buscarCandidato,
  consultarAvaliacao,
  registrarAvaliacao,
  traduzirErro,
} from './candidatosService'
import { dataConsentimento } from './consentimento'
import {
  ROTULO_STATUS_CANDIDATO,
  type Avaliacao,
  type AvaliacaoItem,
  type Candidato,
} from './tipos'

interface RespostaEstado {
  atende: boolean | null
  observacao: string
}

function BlocoCriterios({
  titulo,
  subtitulo,
  itens,
  respostas,
  desabilitado,
  aoMudarAtende,
  aoMudarObservacao,
}: {
  titulo: string
  subtitulo: string
  itens: AvaliacaoItem[]
  respostas: Record<number, RespostaEstado>
  desabilitado: boolean
  aoMudarAtende: (criterioId: number, valor: boolean) => void
  aoMudarObservacao: (criterioId: number, valor: string) => void
}) {
  return (
    <section>
      <h2>{titulo}</h2>
      <p className="cartao__texto" style={{ marginBottom: '10px' }}>
        {subtitulo}
      </p>

      {itens.map((item) => {
        const resposta = respostas[item.criterioId] ?? { atende: null, observacao: '' }
        const nomeRadio = `criterio-${item.criterioId}`
        return (
          <div key={item.criterioId} className="item-avaliacao">
            <div className="item-avaliacao__cabecalho">
              <span className="item-avaliacao__descricao">
                #{item.ordem} · {item.descricao}
              </span>
              <div className="opcoes-atende" role="radiogroup" aria-label={item.descricao}>
                <label>
                  <input
                    type="radio"
                    name={nomeRadio}
                    checked={resposta.atende === true}
                    disabled={desabilitado}
                    onChange={() => aoMudarAtende(item.criterioId, true)}
                  />
                  Sim
                </label>
                <label>
                  <input
                    type="radio"
                    name={nomeRadio}
                    checked={resposta.atende === false}
                    disabled={desabilitado}
                    onChange={() => aoMudarAtende(item.criterioId, false)}
                  />
                  Não
                </label>
              </div>
            </div>

            <input
              className="pn-campo__entrada"
              placeholder="Observação opcional (ex.: exame ou documento verificado)"
              aria-label={`Observação de ${item.descricao}`}
              maxLength={500}
              disabled={desabilitado}
              value={resposta.observacao}
              onChange={(e) => aoMudarObservacao(item.criterioId, e.target.value)}
            />
          </div>
        )
      })}

      {itens.length === 0 && (
        <p className="pn-campo__dica">Nenhum critério deste tipo cadastrado no estudo.</p>
      )}
    </section>
  )
}

export function AvaliacaoElegibilidadePage() {
  const { estudoId, id } = useParams<{ estudoId: string; id: string }>()
  const idEstudo = Number(estudoId)
  const idCandidato = Number(id)
  const rotaCandidatos = `/estudos/${idEstudo}/candidatos`
  const rotaDetalhe = `${rotaCandidatos}/${idCandidato}`

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [candidato, setCandidato] = useState<Candidato | null>(null)
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null)
  const [respostas, setRespostas] = useState<Record<number, RespostaEstado>>({})

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      buscarEstudo(idEstudo),
      buscarCandidato(idEstudo, idCandidato),
      consultarAvaliacao(idCandidato),
    ])
      .then(([dadosEstudo, dadosCandidato, dadosAvaliacao]) => {
        if (!ativo) return
        setEstudo(dadosEstudo)
        setCandidato(dadosCandidato)
        setAvaliacao(dadosAvaliacao)

        const iniciais: Record<number, RespostaEstado> = {}
        for (const item of dadosAvaliacao.criterios) {
          iniciais[item.criterioId] = {
            atende: item.atende,
            observacao: item.observacao ?? '',
          }
        }
        setRespostas(iniciais)
      })
      .catch((e) => {
        if (ativo) {
          setErro(`Não foi possível carregar a avaliação. ${traduzirErro(e).message}`)
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [idEstudo, idCandidato])

  const criterios = useMemo(() => avaliacao?.criterios ?? [], [avaliacao])
  const inclusao = useMemo(
    () => criterios.filter((c) => c.tipo === 'INCLUSAO').sort((a, b) => a.ordem - b.ordem),
    [criterios],
  )
  const exclusao = useMemo(
    () => criterios.filter((c) => c.tipo === 'EXCLUSAO').sort((a, b) => a.ordem - b.ordem),
    [criterios],
  )

  const motivoBloqueio = useMemo(() => {
    if (!estudo || !candidato) return null
    if (estudo.estado !== 'RECRUTAMENTO') {
      return `O estudo está em ${ROTULO_ESTADO[estudo.estado]}. Só é possível avaliar candidatos com o estudo em Recrutamento.`
    }
    if (candidato.status === 'INCLUIDO' || candidato.status === 'RETIRADO') {
      return 'Candidato incluído ou retirado não pode ser reavaliado.'
    }
    if (candidato.consentimento) {
      return 'Candidato com consentimento registrado não pode ser reavaliado.'
    }
    if (inclusao.length === 0) {
      return 'Cadastre ao menos um critério de inclusão no estudo antes de avaliar candidatos.'
    }
    return null
  }, [estudo, candidato, inclusao.length])

  const todosRespondidos = useMemo(
    () =>
      criterios.length > 0 &&
      criterios.every((c) => {
        const r = respostas[c.criterioId]
        return r !== undefined && r.atende !== null
      }),
    [criterios, respostas],
  )

  const previaElegivel = useMemo(() => {
    if (!todosRespondidos || inclusao.length === 0) return null
    const atendeInclusoes = inclusao.every((c) => respostas[c.criterioId]?.atende === true)
    const temExclusao = exclusao.some((c) => respostas[c.criterioId]?.atende === true)
    return atendeInclusoes && !temExclusao
  }, [todosRespondidos, inclusao, exclusao, respostas])

  function mudarAtende(criterioId: number, valor: boolean) {
    setRespostas((atuais) => ({
      ...atuais,
      [criterioId]: { ...(atuais[criterioId] ?? { observacao: '' }), atende: valor },
    }))
    setErro('')
    setSucesso('')
  }

  function mudarObservacao(criterioId: number, valor: string) {
    setRespostas((atuais) => ({
      ...atuais,
      [criterioId]: { ...(atuais[criterioId] ?? { atende: null }), observacao: valor },
    }))
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setErro('')
    setSucesso('')

    const faltantes = criterios.filter((c) => respostas[c.criterioId]?.atende === null)
    if (faltantes.length > 0) {
      setErro(
        `Todos os critérios do estudo devem ser avaliados. Falta responder ${faltantes.length} ${
          faltantes.length === 1 ? 'critério' : 'critérios'
        }.`,
      )
      return
    }

    setSalvando(true)
    try {
      const resultado = await registrarAvaliacao(idCandidato, {
        respostas: criterios.map((c) => ({
          criterioId: c.criterioId,
          atende: Boolean(respostas[c.criterioId]?.atende),
          observacao: respostas[c.criterioId]?.observacao.trim() || null,
        })),
      })
      setAvaliacao(resultado)
      setCandidato((atual) => (atual ? { ...atual, status: resultado.status } : atual))
      setSucesso(
        `Avaliação registrada com sucesso. Resultado: ${ROTULO_STATUS_CANDIDATO[resultado.status]}.`,
      )
    } catch (e) {
      setErro(`Não foi possível registrar a avaliação. ${traduzirErro(e).message}`)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="pagina">
        <p>Carregando avaliação…</p>
      </div>
    )
  }

  const desabilitado = Boolean(motivoBloqueio) || salvando

  return (
    <div className="pagina pagina--formulario">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / <Link to={rotaCandidatos}>{estudo?.titulo ?? 'Candidatos'}</Link> /{' '}
        <Link to={rotaDetalhe}>{candidato?.nome ?? 'Candidato'}</Link> / Avaliação de elegibilidade
      </nav>

      <div className="pagina__cabecalho">
        <div>
          <div className="titulo-com-selo">
            <h1>Avaliação de elegibilidade</h1>
            {candidato && (
              <span className={`selo selo--candidato-${candidato.status.toLowerCase()}`}>
                {ROTULO_STATUS_CANDIDATO[candidato.status]}
              </span>
            )}
          </div>
          <p className="pagina__subtitulo">
            Verificação critério por critério para determinar a elegibilidade do candidato no estudo.
          </p>
        </div>
        <Link to={rotaDetalhe} className="botao botao--contorno">
          Voltar ao candidato
        </Link>
      </div>

      {motivoBloqueio && (
        <div className="aviso aviso--atencao" role="status">
          <strong>Avaliação bloqueada.</strong> {motivoBloqueio}
        </div>
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

      {candidato && (
        <div className="cartao dados-candidato">
          <div>
            <small>Candidato</small>
            <strong>{candidato.nome}</strong>
          </div>
          <div>
            <small>Nascimento</small>
            <strong>{isoParaBR(candidato.dataNascimento)}</strong>
          </div>
          <div>
            <small>Estudo</small>
            <strong>{estudo?.titulo ?? '—'}</strong>
          </div>
          <div>
            <small>Última avaliação</small>
            <strong>
              {avaliacao?.avaliadoEm
                ? `${dataConsentimento(avaliacao.avaliadoEm)}${
                    avaliacao.avaliadoPor ? ` por ${avaliacao.avaliadoPor.nome}` : ''
                  }`
                : 'Ainda não avaliado'}
            </strong>
          </div>
        </div>
      )}

      <form className="cartao formulario" onSubmit={enviar} noValidate>
        <fieldset className="formulario__campos" disabled={desabilitado}>
          <BlocoCriterios
            titulo="Critérios de inclusão"
            subtitulo="O candidato deve atender (Sim) a todos os critérios de inclusão para ser elegível."
            itens={inclusao}
            respostas={respostas}
            desabilitado={desabilitado}
            aoMudarAtende={mudarAtende}
            aoMudarObservacao={mudarObservacao}
          />

          <BlocoCriterios
            titulo="Critérios de exclusão"
            subtitulo="O candidato não pode apresentar (Não) nenhum critério de exclusão."
            itens={exclusao}
            respostas={respostas}
            desabilitado={desabilitado}
            aoMudarAtende={mudarAtende}
            aoMudarObservacao={mudarObservacao}
          />
        </fieldset>

        {previaElegivel !== null && (
          <div
            className={
              previaElegivel
                ? 'previa-veredito previa-veredito--elegivel'
                : 'previa-veredito previa-veredito--inelegivel'
            }
            role="status"
          >
            <strong>
              Resultado calculado: {previaElegivel ? 'Candidato Elegível' : 'Candidato Inelegível'}.
            </strong>{' '}
            {previaElegivel
              ? 'Atende a todos os critérios de inclusão e não apresenta nenhum de exclusão.'
              : 'Não cumpre todos os requisitos de inclusão ou apresenta condição de exclusão.'}
          </div>
        )}

        <footer className="formulario__rodape">
          <small>Todos os critérios precisam ser respondidos para registrar a avaliação.</small>
          <div className="formulario__acoes">
            <Link to={rotaDetalhe} className="botao botao--contorno">
              Cancelar
            </Link>
            <button type="submit" className="botao botao--primario" disabled={desabilitado}>
              {salvando ? 'Registrando…' : 'Registrar avaliação'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
