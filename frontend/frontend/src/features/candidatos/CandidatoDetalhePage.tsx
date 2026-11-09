import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isoParaBR } from '../estudos/datas'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import {
  buscarCandidato,
  contarIncluidos,
  incluirCandidato,
  registrarConsentimento,
  traduzirErro,
} from './candidatosService'
import { ConfirmacaoDialogo } from './ConfirmacaoDialogo'
import { ContadorVagas } from './ContadorVagas'
import { dataConsentimento, podeRegistrarConsentimento } from './consentimento'
import { MENSAGEM_BLOQUEIO, bloqueioInclusao, mensagemErroInclusao } from './inclusao'
import { ROTULO_STATUS_CANDIDATO, type Candidato } from './tipos'

function CartaoConsentimento({
  candidato,
  aoRegistrar,
}: {
  candidato: Candidato
  aoRegistrar: () => void
}) {
  let conteudo
  if (candidato.consentimento) {
    const { registradoEm, registradoPor } = candidato.consentimento
    conteudo = (
      <p className="consentimento__registrado">
        <strong>Consentimento registrado</strong> em {dataConsentimento(registradoEm)}
        {registradoPor ? ` por ${registradoPor}` : ''}.
      </p>
    )
  } else if (podeRegistrarConsentimento(candidato)) {
    conteudo = (
      <>
        <p className="cartao__texto">Nenhum consentimento registrado. O candidato está elegível.</p>
        <button type="button" className="botao botao--primario" onClick={aoRegistrar}>
          Registrar consentimento
        </button>
      </>
    )
  } else {
    conteudo = (
      <p className="cartao__texto">
        {candidato.status === 'CADASTRADO'
          ? 'Disponível depois que a avaliação marcar o candidato como elegível.'
          : 'Indisponível: o consentimento só pode ser registrado para candidato elegível.'}
      </p>
    )
  }
  return (
    <section className="cartao cartao--secao" aria-labelledby="titulo-consentimento">
      <h2 id="titulo-consentimento">Consentimento (simulado)</h2>
      {conteudo}
    </section>
  )
}

function CartaoInclusao({
  candidato,
  estudo,
  ocupadas,
  aoIncluir,
}: {
  candidato: Candidato
  estudo: Estudo | null
  ocupadas: number | null
  aoIncluir: () => void
}) {
  let conteudo
  if (candidato.status === 'INCLUIDO') {
    conteudo = (
      <p className="consentimento__registrado">
        <strong>Incluído no estudo</strong>
        {candidato.dataInclusao ? ` em ${dataConsentimento(candidato.dataInclusao)}` : ''}.
      </p>
    )
  } else {
    const bloqueio = bloqueioInclusao(candidato, estudo, ocupadas)
    conteudo = (
      <>
        <p className={bloqueio === 'VAGAS_ESGOTADAS' ? 'cartao__texto cartao__texto--erro' : 'cartao__texto'}>
          {bloqueio
            ? MENSAGEM_BLOQUEIO[bloqueio].texto
            : 'Ao incluir, o candidato ocupa uma vaga e passa a participar do estudo.'}
        </p>
        <button type="button" className="botao botao--primario" onClick={aoIncluir} disabled={bloqueio !== null}>
          Incluir no estudo
        </button>
      </>
    )
  }
  return (
    <section className="cartao cartao--secao" aria-labelledby="titulo-inclusao">
      <h2 id="titulo-inclusao">Inclusão no estudo</h2>
      {conteudo}
    </section>
  )
}

export function CandidatoDetalhePage() {
  const { estudoId, id } = useParams<{ estudoId: string; id: string }>()
  const idEstudo = Number(estudoId)
  const idCandidato = Number(id)
  const lista = `/estudos/${idEstudo}/candidatos`

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [candidato, setCandidato] = useState<Candidato | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [erroInclusao, setErroInclusao] = useState<{ titulo: string; texto: string } | null>(null)
  const [sucesso, setSucesso] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [registrando, setRegistrando] = useState(false)
  const [ocupadas, setOcupadas] = useState<number | null>(null)
  const [confirmandoInclusao, setConfirmandoInclusao] = useState(false)
  const [incluindo, setIncluindo] = useState(false)

  useEffect(() => {
    let ativo = true
    Promise.all([buscarEstudo(idEstudo), buscarCandidato(idEstudo, idCandidato)])
      .then(([e, c]) => {
        if (!ativo) return
        setEstudo(e)
        setCandidato(c)
      })
      .catch((e) => {
        if (ativo) setErro(`Não foi possível carregar o candidato. ${traduzirErro(e).message}`)
      })
      .finally(() => {
        if (ativo) setCarregando(false)
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
  }, [idEstudo, idCandidato])

  async function confirmarInclusao() {
    setIncluindo(true)
    setErro('')
    setErroInclusao(null)
    setSucesso('')
    try {
      const resultado = await incluirCandidato(idCandidato)
      setOcupadas(resultado.vagasOcupadas)
      setEstudo((e) => (e ? { ...e, limiteParticipantes: resultado.limiteParticipantes } : e))
      setCandidato(await buscarCandidato(idEstudo, idCandidato))
      setSucesso(
        `Candidato incluído no estudo. Vagas ocupadas: ${resultado.vagasOcupadas} de ${resultado.limiteParticipantes}.`,
      )
    } catch (e) {
      setErroInclusao(mensagemErroInclusao(traduzirErro(e)))
    } finally {
      setIncluindo(false)
      setConfirmandoInclusao(false)
    }
  }

  async function confirmarConsentimento() {
    setRegistrando(true)
    setErro('')
    try {
      const atualizado = await registrarConsentimento(idEstudo, idCandidato)
      setCandidato(atualizado)
      setSucesso('Consentimento registrado. O candidato já pode ser incluído no estudo.')
    } catch (e) {
      setErro(`Não foi possível registrar o consentimento. ${traduzirErro(e).message}`)
    } finally {
      setRegistrando(false)
      setConfirmando(false)
    }
  }

  if (carregando) {
    return (
      <div className="pagina">
        <p>Carregando…</p>
      </div>
    )
  }

  return (
    <div className="pagina">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / <Link to={lista}>{estudo?.titulo ?? 'Candidatos'}</Link> /{' '}
        {candidato?.nome ?? 'Candidato'}
      </nav>
      <div className="pagina__cabecalho">
        <div className="titulo-com-selo">
          <h1>{candidato?.nome ?? 'Candidato'}</h1>
          {candidato && (
            <span className={`selo selo--candidato-${candidato.status.toLowerCase()}`}>
              {ROTULO_STATUS_CANDIDATO[candidato.status]}
            </span>
          )}
        </div>
        <div className="formulario__acoes">
          {candidato && (
            <>
              <Link to={`${lista}/${candidato.id}/avaliacao`} className="botao botao--contorno">
                Avaliar elegibilidade
              </Link>
              <Link to={`${lista}/${candidato.id}/editar`} className="botao botao--contorno">
                Editar dados
              </Link>
            </>
          )}
          <Link to={lista} className="botao botao--contorno">
            Voltar à lista
          </Link>
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

      {candidato && (
        <>
          <div className="detalhe__resumo">
          <div className="cartao dados-candidato">
            <div>
              <small>E-mail</small>
              <strong>{candidato.email}</strong>
            </div>
            <div>
              <small>Nascimento</small>
              <strong>{isoParaBR(candidato.dataNascimento)}</strong>
            </div>
            <div>
              <small>Telefone</small>
              <strong>{candidato.telefone || '—'}</strong>
            </div>
            <div>
              <small>Estudo</small>
              <strong>{estudo?.titulo ?? '—'}</strong>
            </div>
          </div>
          {estudo && <ContadorVagas ocupadas={ocupadas} limite={estudo.limiteParticipantes} />}
          </div>

          <div className="detalhe__colunas">
            <CartaoConsentimento candidato={candidato} aoRegistrar={() => setConfirmando(true)} />
            <CartaoInclusao
              candidato={candidato}
              estudo={estudo}
              ocupadas={ocupadas}
              aoIncluir={() => setConfirmandoInclusao(true)}
            />
          </div>
        </>
      )}

      {confirmando && candidato && (
        <ConfirmacaoDialogo
          titulo="Registrar consentimento?"
          rotuloConfirmar="Confirmar registro"
          rotuloConfirmando="Registrando…"
          confirmando={registrando}
          aoConfirmar={confirmarConsentimento}
          aoCancelar={() => setConfirmando(false)}
        >
          <p className="cartao__texto">
            Confirme que {candidato.nome} concordou em participar do estudo
            {estudo ? ` "${estudo.titulo}"` : ''}. O registro é simulado e fica com a data de hoje e o seu nome.
          </p>
        </ConfirmacaoDialogo>
      )}
      {confirmandoInclusao && candidato && (
        <ConfirmacaoDialogo
          titulo="Incluir no estudo?"
          rotuloConfirmar="Confirmar inclusão"
          rotuloConfirmando="Incluindo…"
          confirmando={incluindo}
          aoConfirmar={confirmarInclusao}
          aoCancelar={() => setConfirmandoInclusao(false)}
        >
          <p className="cartao__texto">
            {candidato.nome} vai ocupar uma vaga
            {estudo && ocupadas !== null
              ? ` (${ocupadas + 1} de ${estudo.limiteParticipantes} depois da inclusão)`
              : ''}{' '}
            e passa a participar do estudo.
          </p>
        </ConfirmacaoDialogo>
      )}
    </div>
  )
}
