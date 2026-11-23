import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import '../../estilos/agenda.css'
import { useContext, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AuthContext } from '../auth/AuthContext'
import { temPermissao } from '../auth/permissoes'
import { AbasEstudo } from '../estudos/AbasEstudo'
import { isoParaBR } from '../estudos/datas'
import { buscarEstudo } from '../estudos/estudosService'
import { ROTULO_ESTADO, type Estudo } from '../estudos/tipos'
import {
  buscarVisitaAgendada,
  registrarExecucaoVisita,
  traduzirErro,
} from './agendaService'
import {
  ROTULO_STATUS_VISITA,
  type AcaoExecucaoVisita,
  type VisitaAgendada,
} from './tipos'
import { validarExecucaoVisita } from './validacao'

export function AcoesVisitaPage() {
  const { id, visitaId } = useParams<{ id: string; visitaId: string }>()
  const estudoId = Number(id)
  const idVisita = Number(visitaId)
  const navegar = useNavigate()
  const auth = useContext(AuthContext)
  const somenteLeitura = Boolean(
    auth?.usuario && !temPermissao(auth.usuario.perfil, 'gerenciarVisitas'),
  )

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [visita, setVisita] = useState<VisitaAgendada | null>(null)
  const [acao, setAcao] = useState<AcaoExecucaoVisita>('REALIZADA')
  const [observacoes, setObservacoes] = useState('')
  const [motivoCancelamento, setMotivoCancelamento] = useState('')

  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroMotivo, setErroMotivo] = useState('')
  const [erroGeral, setErroGeral] = useState('')

  useEffect(() => {
    let ativo = true
    Promise.all([buscarEstudo(estudoId), buscarVisitaAgendada(estudoId, idVisita)])
      .then(([dadosEstudo, dadosVisita]) => {
        if (!ativo) return
        setEstudo(dadosEstudo)
        setVisita(dadosVisita)
        setObservacoes(dadosVisita.observacoes ?? '')
        if (dadosVisita.status !== 'AGENDADA') {
          setAcao(dadosVisita.status)
          setMotivoCancelamento(dadosVisita.motivoCancelamento ?? '')
        }
      })
      .catch((e) => {
        if (ativo) {
          setErroGeral(`Não foi possível carregar a visita agendada. ${traduzirErro(e).message}`)
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [estudoId, idVisita])

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setErroGeral('')
    setErroMotivo('')

    const validacao = validarExecucaoVisita(acao, motivoCancelamento)
    if (validacao.motivoCancelamento) {
      setErroMotivo(validacao.motivoCancelamento)
      return
    }

    setSalvando(true)
    try {
      await registrarExecucaoVisita(estudoId, idVisita, {
        status: acao,
        observacoes: observacoes.trim() ? observacoes.trim() : null,
        motivoCancelamento: acao === 'CANCELADA' ? motivoCancelamento.trim() : null,
      })
      navegar(`/estudos/${estudoId}/agenda`)
    } catch (e) {
      const traduzido = traduzirErro(e)
      if (traduzido.errosCampos.motivoCancelamento) {
        setErroMotivo(traduzido.errosCampos.motivoCancelamento)
      }
      setErroGeral(`Não foi possível atualizar o status da visita. ${traduzido.message}`)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="pagina">
        <p>Carregando detalhes da visita agendada…</p>
      </div>
    )
  }

  return (
    <div className="pagina pagina--formulario">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> /{' '}
        <Link to={`/estudos/${estudoId}/agenda`}>{estudo?.titulo ?? 'Agenda'}</Link> / Ações na visita
      </nav>

      <AbasEstudo estudoId={estudoId} ativa="agenda" />

      <div className="pagina__cabecalho">
        <div>
          <div className="titulo-com-selo">
            <h1>Ações na visita agendada</h1>
            {visita && (
              <span className={`selo selo--visita-${visita.status.toLowerCase()}`}>
                {ROTULO_STATUS_VISITA[visita.status]}
              </span>
            )}
            {estudo && (
              <span className={`selo selo--${estudo.estado.toLowerCase()}`}>
                {ROTULO_ESTADO[estudo.estado]}
              </span>
            )}
          </div>
          <p className="pagina__subtitulo">
            Registre a realização, ausência do participante ou o cancelamento da visita com motivo obrigatório.
          </p>
        </div>
      </div>

      {/* Erro de motivo obrigatório ao cancelar ou falha da API (R2-06) */}
      {erroMotivo && (
        <div className="aviso aviso--erro" role="alert">
          <strong>Não foi possível cancelar a visita.</strong> {erroMotivo}
        </div>
      )}
      {erroGeral && !erroMotivo && (
        <div className="aviso aviso--erro" role="alert">
          {erroGeral}
        </div>
      )}

      {visita && (
        <section className="cartao resumo-visita-agendada" aria-label="Resumo da visita agendada">
          <div>
            <small>Participante</small>
            <strong>{visita.participante.nome}</strong>
            <small>{visita.participante.email}</small>
          </div>
          <div>
            <small>Visita prevista</small>
            <strong>{visita.visitaPrevista.nome}</strong>
            <small>Dia D{visita.visitaPrevista.diaPrevisto}</small>
          </div>
          <div>
            <small>Data e horário agendados</small>
            <strong>
              {isoParaBR(visita.dataAgendada)} às {visita.horaAgendada}
            </strong>
            {visita.local && <small>{visita.local}</small>}
          </div>
          <div>
            <small>Janela do protocolo</small>
            <strong>
              {visita.janelaInicio && visita.janelaFim
                ? `${isoParaBR(visita.janelaInicio)} a ${isoParaBR(visita.janelaFim)}`
                : '—'}
            </strong>
            {visita.foraDaJanela && <span className="selo selo--fora-janela">Fora da janela</span>}
          </div>
        </section>
      )}

      {somenteLeitura && (
        <div className="aviso aviso--atencao" role="status">
          <strong>Somente consulta.</strong> Apenas o Coordenador pode alterar o estado da visita.
        </div>
      )}

      <form className="cartao formulario" onSubmit={enviar} noValidate>
        <fieldset className="formulario__campos" disabled={salvando || somenteLeitura}>
          <section>
            <h2>Escolha a ação para esta visita</h2>
            <div className="opcoes-acao-visita" role="group" aria-label="Ações disponíveis para a visita">
              <button
                type="button"
                className={
                  acao === 'REALIZADA'
                    ? 'opcao-acao-visita opcao-acao-visita--ativa'
                    : 'opcao-acao-visita'
                }
                aria-pressed={acao === 'REALIZADA'}
                onClick={() => {
                  setAcao('REALIZADA')
                  setErroMotivo('')
                }}
              >
                <strong>Realizada</strong>
                <small>O participante compareceu e os procedimentos previstos foram executados.</small>
              </button>

              <button
                type="button"
                className={
                  acao === 'AUSENTE'
                    ? 'opcao-acao-visita opcao-acao-visita--ativa'
                    : 'opcao-acao-visita'
                }
                aria-pressed={acao === 'AUSENTE'}
                onClick={() => {
                  setAcao('AUSENTE')
                  setErroMotivo('')
                }}
              >
                <strong>Ausente</strong>
                <small>O participante não compareceu na data e horário agendados.</small>
              </button>

              <button
                type="button"
                className={
                  acao === 'CANCELADA'
                    ? 'opcao-acao-visita opcao-acao-visita--perigo opcao-acao-visita--ativa'
                    : 'opcao-acao-visita opcao-acao-visita--perigo'
                }
                aria-pressed={acao === 'CANCELADA'}
                onClick={() => setAcao('CANCELADA')}
              >
                <strong>Cancelar</strong>
                <small>Cancela o agendamento atual. Exige informar o motivo do cancelamento.</small>
              </button>
            </div>

            {acao === 'CANCELADA' && (
              <label className="pn-campo" style={{ marginTop: '10px' }}>
                <span className="pn-campo__rotulo">Motivo do cancelamento *</span>
                <textarea
                  rows={3}
                  className={
                    erroMotivo ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'
                  }
                  placeholder="Informe o motivo do cancelamento (ex.: solicitação de reagendamento pelo participante, intercorrência clínica)"
                  maxLength={500}
                  value={motivoCancelamento}
                  onChange={(e) => {
                    setMotivoCancelamento(e.target.value)
                    setErroMotivo('')
                  }}
                />
                {erroMotivo ? (
                  <span className="pn-campo__erro">{erroMotivo}</span>
                ) : (
                  <span className="pn-campo__dica">
                    Obrigatório para cancelar a visita agendada.
                  </span>
                )}
              </label>
            )}

            <label className="pn-campo" style={{ marginTop: '10px' }}>
              <span className="pn-campo__rotulo">Observações do atendimento</span>
              <textarea
                rows={3}
                className="pn-campo__entrada"
                placeholder="Opcional. Registre anotações sobre o comparecimento ou orientações de acompanhamento."
                maxLength={500}
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
              />
            </label>
          </section>
        </fieldset>

        <footer className="formulario__rodape">
          <small>
            {acao === 'CANCELADA' ? '* Motivo do cancelamento obrigatório' : 'Confirme o registro da visita'}
          </small>
          <div className="formulario__acoes">
            <Link to={`/estudos/${estudoId}/agenda`} className="botao botao--contorno">
              Voltar
            </Link>
            <button
              type="submit"
              className="botao botao--primario"
              disabled={salvando || somenteLeitura}
            >
              {salvando
                ? 'Salvando…'
                : acao === 'REALIZADA'
                  ? 'Confirmar como realizada'
                  : acao === 'AUSENTE'
                    ? 'Registrar ausência'
                    : 'Confirmar cancelamento'}
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
