import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import '../../estilos/agenda.css'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { listarCandidatos } from '../candidatos/candidatosService'
import { ROTULO_STATUS_CANDIDATO, type Candidato } from '../candidatos/tipos'
import { AbasEstudo } from '../estudos/AbasEstudo'
import { isoParaBR } from '../estudos/datas'
import { buscarEstudo, listarVisitasPrevistas } from '../estudos/estudosService'
import { ROTULO_ESTADO, type Estudo, type VisitaPrevista } from '../estudos/tipos'
import {
  agendarVisita,
  lerCacheVisitasPrevistas,
  listarVisitasAgendadas,
  salvarCacheVisitasPrevistas,
  traduzirErro,
} from './agendaService'
import type { ErrosAgendamentoVisita, VisitaAgendada } from './tipos'
import {
  analisarJanelaAgendamento,
  calcularJanelaVisita,
  validarAgendamentoVisita,
} from './validacao'

const CANDIDATOS_FALLBACK: Candidato[] = [
  {
    id: 101,
    nome: 'Maria Souza',
    email: 'maria.souza@exemplo.test',
    telefone: '(83) 99999-1111',
    dataNascimento: '1988-03-14',
    status: 'INCLUIDO',
    dataInclusao: '2026-11-10',
  },
  {
    id: 102,
    nome: 'Ana Ribeiro',
    email: 'ana.ribeiro@exemplo.test',
    telefone: '(83) 99999-2222',
    dataNascimento: '1995-05-22',
    status: 'INCLUIDO',
    dataInclusao: '2026-11-12',
  },
  {
    id: 103,
    nome: 'João Lima',
    email: 'joao.lima@exemplo.test',
    telefone: '(83) 99999-3333',
    dataNascimento: '1990-01-02',
    status: 'ELEGIVEL',
    dataInclusao: null,
  },
]

export function AgendamentoVisitaFormPage() {
  const { id } = useParams<{ id: string }>()
  const estudoId = Number(id)
  const navegar = useNavigate()
  const [searchParams] = useSearchParams()
  const participanteInicial = searchParams.get('participanteId') ?? ''

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [visitasPrevistas, setVisitasPrevistas] = useState<VisitaPrevista[]>([])
  const [visitasAgendadas, setVisitasAgendadas] = useState<VisitaAgendada[]>([])

  const [participanteId, setParticipanteId] = useState(participanteInicial)
  const [visitaPrevistaId, setVisitaPrevistaId] = useState('')
  const [dataAgendada, setDataAgendada] = useState('')
  const [horaAgendada, setHoraAgendada] = useState('09:00')
  const [local, setLocal] = useState('Ambulatório Central · Sala 204')
  const [observacoes, setObservacoes] = useState('')

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erros, setErros] = useState<ErrosAgendamentoVisita>({})
  const [erroGeral, setErroGeral] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([
      buscarEstudo(estudoId),
      listarCandidatos(estudoId).catch(() => CANDIDATOS_FALLBACK),
      listarVisitasPrevistas(estudoId)
        .then((lista) => {
          salvarCacheVisitasPrevistas(estudoId, lista)
          return lista
        })
        .catch(() => lerCacheVisitasPrevistas<VisitaPrevista>(estudoId)),
      listarVisitasAgendadas(estudoId),
    ])
      .then(([dadosEstudo, listaCandidatosApi, listaVisitasPrevistas, listaAgendadas]) => {
        if (!ativo) return
        const listaCandidatos =
          listaCandidatosApi.length > 0 ? listaCandidatosApi : CANDIDATOS_FALLBACK

        setEstudo(dadosEstudo)
        setCandidatos(listaCandidatos)
        setVisitasPrevistas(listaVisitasPrevistas)
        setVisitasAgendadas(listaAgendadas)

        const pId =
          participanteInicial ||
          String(listaCandidatos.find((c) => c.status === 'INCLUIDO')?.id ?? '')
        const vId = String(listaVisitasPrevistas[0]?.id ?? '')
        setParticipanteId(pId)
        setVisitaPrevistaId(vId)

        const part = listaCandidatos.find((c) => String(c.id) === pId)
        const vis = listaVisitasPrevistas.find((v) => String(v.id) === vId)
        const janela = calcularJanelaVisita(part?.dataInclusao, vis, dadosEstudo.dataInicio)
        if (janela) {
          setDataAgendada(janela.dataSugerida)
        }
      })
      .catch((e) => {
        if (ativo) {
          setErroGeral(`Não foi possível carregar os dados para agendamento. ${traduzirErro(e).message}`)
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [estudoId, participanteInicial])

  const participanteSelecionado = useMemo(
    () => candidatos.find((c) => String(c.id) === participanteId) ?? null,
    [candidatos, participanteId],
  )

  const visitaPrevistaSelecionada = useMemo(
    () => visitasPrevistas.find((v) => String(v.id) === visitaPrevistaId) ?? null,
    [visitasPrevistas, visitaPrevistaId],
  )

  function atualizarParticipante(novoId: string) {
    setParticipanteId(novoId)
    setErros((atuais) => ({ ...atuais, participanteId: undefined, visitaPrevistaId: undefined }))
    const part = candidatos.find((c) => String(c.id) === novoId)
    const janela = calcularJanelaVisita(
      part?.dataInclusao,
      visitaPrevistaSelecionada,
      estudo?.dataInicio,
    )
    if (janela) {
      setDataAgendada(janela.dataSugerida)
      setErros((atuais) => ({ ...atuais, dataAgendada: undefined }))
    }
  }

  function atualizarVisitaPrevista(novoId: string) {
    setVisitaPrevistaId(novoId)
    setErros((atuais) => ({ ...atuais, visitaPrevistaId: undefined }))
    const vis = visitasPrevistas.find((v) => String(v.id) === novoId)
    const janela = calcularJanelaVisita(
      participanteSelecionado?.dataInclusao,
      vis,
      estudo?.dataInicio,
    )
    if (janela) {
      setDataAgendada(janela.dataSugerida)
      setErros((atuais) => ({ ...atuais, dataAgendada: undefined }))
    }
  }

  const analiseJanela = useMemo(
    () =>
      analisarJanelaAgendamento(
        dataAgendada,
        participanteSelecionado?.dataInclusao,
        visitaPrevistaSelecionada,
        estudo?.dataInicio,
      ),
    [dataAgendada, participanteSelecionado, visitaPrevistaSelecionada, estudo],
  )

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setErroGeral('')

    const validacao = validarAgendamentoVisita({
      participanteId,
      visitaPrevistaId,
      dataAgendada,
      horaAgendada,
      candidatos,
      visitasPrevistas,
      visitasAgendadas,
    })
    setErros(validacao)
    if (Object.keys(validacao).length > 0) return

    setSalvando(true)
    try {
      await agendarVisita(
        estudoId,
        {
          participanteId: Number(participanteId),
          visitaPrevistaId: Number(visitaPrevistaId),
          dataAgendada: dataAgendada.trim(),
          horaAgendada: horaAgendada.trim(),
          local: local.trim() ? local.trim() : null,
          observacoes: observacoes.trim() ? observacoes.trim() : null,
        },
        {
          participanteNome: participanteSelecionado?.nome,
          participanteEmail: participanteSelecionado?.email,
          dataInclusao: participanteSelecionado?.dataInclusao ?? estudo?.dataInicio ?? null,
          visitaOrdem: visitaPrevistaSelecionada?.ordem,
          visitaNome: visitaPrevistaSelecionada?.nome,
          diaPrevisto: visitaPrevistaSelecionada?.diaPrevisto,
          janelaDias: visitaPrevistaSelecionada?.janelaDias ?? null,
        },
      )
      navegar(`/estudos/${estudoId}/agenda`)
    } catch (e) {
      const traduzido = traduzirErro(e)
      if (Object.keys(traduzido.errosCampos).length > 0) {
        setErros(traduzido.errosCampos)
      }
      setErroGeral(`Não foi possível agendar a visita. ${traduzido.message}`)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="pagina">
        <p>Carregando formulário de agendamento…</p>
      </div>
    )
  }

  const listaErros = Object.values(erros).filter(Boolean) as string[]

  return (
    <div className="pagina pagina--formulario">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> /{' '}
        <Link to={`/estudos/${estudoId}/agenda`}>{estudo?.titulo ?? 'Agenda'}</Link> / Agendar visita
      </nav>

      <AbasEstudo estudoId={estudoId} ativa="agenda" />

      <div className="pagina__cabecalho">
        <div>
          <div className="titulo-com-selo">
            <h1>Agendar visita</h1>
            {estudo && (
              <span className={`selo selo--${estudo.estado.toLowerCase()}`}>
                {ROTULO_ESTADO[estudo.estado]}
              </span>
            )}
          </div>
          <p className="pagina__subtitulo">
            Escolha o participante incluído e a visita prevista do protocolo. A data sugerida é preenchida
            automaticamente a partir da inclusão (D0).
          </p>
        </div>
      </div>

      {/* Resumo de erros de validação / regras de negócio (R2-05) */}
      {listaErros.length > 0 && (
        <div className="aviso aviso--erro" role="alert">
          <strong>Não foi possível confirmar o agendamento. Revise os impedimentos abaixo:</strong>
          <ul>
            {listaErros.map((msg, idx) => (
              <li key={idx}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {erroGeral && listaErros.length === 0 && (
        <div className="aviso aviso--erro" role="alert">
          {erroGeral}
        </div>
      )}

      {/* Aviso de data fora da janela prevista do protocolo (R2-03) */}
      {analiseJanela?.foraDaJanela && (
        <div className="aviso aviso--atencao" role="status">
          <strong>Aviso: data fora da janela prevista do protocolo.</strong> A data escolhida (
          {isoParaBR(dataAgendada)}) está a {analiseJanela.diasDesvio}{' '}
          {analiseJanela.diasDesvio === 1 ? 'dia' : 'dias'} da data sugerida (
          {isoParaBR(analiseJanela.dataSugerida)}). A janela ideal para esta visita é de{' '}
          <strong>
            {isoParaBR(analiseJanela.janelaInicio)} a {isoParaBR(analiseJanela.janelaFim)}
          </strong>
          . O agendamento ainda pode ser salvo com justificativa nas observações.
        </div>
      )}

      <form className="cartao formulario" onSubmit={enviar} noValidate>
        <fieldset className="formulario__campos" disabled={salvando}>
          <section>
            <h2>Participante e visita prevista</h2>
            <div className="formulario__grade">
              <label className="pn-campo">
                <span className="pn-campo__rotulo">Participante *</span>
                <select
                  className={
                    erros.participanteId
                      ? 'pn-campo__entrada pn-campo__entrada--erro'
                      : 'pn-campo__entrada'
                  }
                  value={participanteId}
                  onChange={(e) => atualizarParticipante(e.target.value)}
                >
                  <option value="">Selecione um participante</option>
                  {candidatos.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.nome} ({ROTULO_STATUS_CANDIDATO[c.status]})
                    </option>
                  ))}
                </select>
                {erros.participanteId ? (
                  <span className="pn-campo__erro">{erros.participanteId}</span>
                ) : (
                  <span className="pn-campo__dica">
                    Somente participantes com status Incluído podem ter visitas agendadas.
                  </span>
                )}
              </label>

              <label className="pn-campo">
                <span className="pn-campo__rotulo">Visita prevista *</span>
                <select
                  className={
                    erros.visitaPrevistaId
                      ? 'pn-campo__entrada pn-campo__entrada--erro'
                      : 'pn-campo__entrada'
                  }
                  value={visitaPrevistaId}
                  onChange={(e) => atualizarVisitaPrevista(e.target.value)}
                >
                  <option value="">
                    {visitasPrevistas.length === 0
                      ? 'Nenhuma visita prevista cadastrada neste estudo'
                      : 'Selecione uma visita prevista'}
                  </option>
                  {visitasPrevistas.map((v) => (
                    <option key={v.id} value={String(v.id)}>
                      {v.nome} (D{v.diaPrevisto}
                      {v.janelaDias !== null ? `, ±${v.janelaDias}d` : ''})
                    </option>
                  ))}
                </select>
                {erros.visitaPrevistaId ? (
                  <span className="pn-campo__erro">{erros.visitaPrevistaId}</span>
                ) : visitasPrevistas.length === 0 ? (
                  <span className="pn-campo__dica">
                    Cadastre primeiro as visitas do protocolo na aba{' '}
                    <Link to={`/estudos/${estudoId}/visitas-previstas`} className="link">
                      Visitas previstas
                    </Link>
                    .
                  </span>
                ) : (
                  <span className="pn-campo__dica">
                    Visitas cadastradas na aba Visitas previstas do estudo.
                  </span>
                )}
              </label>
            </div>

            {analiseJanela && (
              <div className="resumo-janela" role="note" aria-label="Cálculo da janela do protocolo">
                <div>
                  <small>Data de inclusão (D0)</small>
                  <strong>{isoParaBR(analiseJanela.dataInclusao)}</strong>
                </div>
                <div>
                  <small>Data sugerida (D{visitaPrevistaSelecionada?.diaPrevisto ?? 0})</small>
                  <strong>{isoParaBR(analiseJanela.dataSugerida)}</strong>
                </div>
                <div>
                  <small>Janela permitida (±{analiseJanela.toleranciaDias} dias)</small>
                  <strong>
                    {isoParaBR(analiseJanela.janelaInicio)} a {isoParaBR(analiseJanela.janelaFim)}
                  </strong>
                </div>
                <div>
                  <small>Situação da data escolhida</small>
                  <strong>
                    {analiseJanela.foraDaJanela ? 'Fora da janela prevista' : 'Dentro da janela'}
                  </strong>
                </div>
              </div>
            )}
          </section>

          <section>
            <h2>Data, horário e local</h2>
            <div className="formulario__grade">
              <label className="pn-campo">
                <span className="pn-campo__rotulo">Data da visita (sugerida preenchida) *</span>
                <input
                  type="date"
                  className={
                    erros.dataAgendada
                      ? 'pn-campo__entrada pn-campo__entrada--erro'
                      : 'pn-campo__entrada'
                  }
                  value={dataAgendada}
                  onChange={(e) => {
                    setDataAgendada(e.target.value)
                    setErros((atuais) => ({ ...atuais, dataAgendada: undefined }))
                  }}
                />
                {erros.dataAgendada ? (
                  <span className="pn-campo__erro">{erros.dataAgendada}</span>
                ) : (
                  analiseJanela && (
                    <span className="pn-campo__dica">
                      Data sugerida pelo protocolo: {isoParaBR(analiseJanela.dataSugerida)}.
                    </span>
                  )
                )}
              </label>

              <label className="pn-campo">
                <span className="pn-campo__rotulo">Horário *</span>
                <input
                  type="time"
                  className={
                    erros.horaAgendada
                      ? 'pn-campo__entrada pn-campo__entrada--erro'
                      : 'pn-campo__entrada'
                  }
                  value={horaAgendada}
                  onChange={(e) => {
                    setHoraAgendada(e.target.value)
                    setErros((atuais) => ({ ...atuais, horaAgendada: undefined }))
                  }}
                />
                {erros.horaAgendada ? (
                  <span className="pn-campo__erro">{erros.horaAgendada}</span>
                ) : (
                  <span className="pn-campo__dica">Horário previsto para o atendimento presencial.</span>
                )}
              </label>
            </div>

            <label className="pn-campo" style={{ marginTop: '8px' }}>
              <span className="pn-campo__rotulo">Local / consultório</span>
              <input
                className="pn-campo__entrada"
                placeholder="Ex.: Ambulatório Central · Sala 204"
                maxLength={160}
                value={local}
                onChange={(e) => setLocal(e.target.value)}
              />
            </label>

            <label className="pn-campo" style={{ marginTop: '8px' }}>
              <span className="pn-campo__rotulo">Observações / justificativa de janela</span>
              <textarea
                rows={3}
                className="pn-campo__entrada"
                placeholder="Opcional. Informe orientações ao participante ou justificativa caso a data esteja fora da janela."
                maxLength={500}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </label>
          </section>
        </fieldset>

        <footer className="formulario__rodape">
          <small>* Campos obrigatórios</small>
          <div className="formulario__acoes">
            <Link to={`/estudos/${estudoId}/agenda`} className="botao botao--contorno">
              Cancelar
            </Link>
            <button type="submit" className="botao botao--primario" disabled={salvando}>
              {salvando ? 'Agendando…' : 'Confirmar agendamento'}
            </button>
          </div>
        </footer>
      </form>

      <footer className="pagina__rodape">
        <Link to={`/estudos/${estudoId}/agenda`} className="botao botao--contorno">
          Voltar à agenda
        </Link>
      </footer>
    </div>
  )
}
