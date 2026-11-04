import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { isoParaBR } from '../estudos/datas'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import { buscarCandidato, registrarConsentimento, traduzirErro } from './candidatosService'
import { ConfirmacaoDialogo } from './ConfirmacaoDialogo'
import { dataConsentimento, podeRegistrarConsentimento } from './consentimento'
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

export function CandidatoDetalhePage() {
  const { estudoId, id } = useParams<{ estudoId: string; id: string }>()
  const idEstudo = Number(estudoId)
  const idCandidato = Number(id)
  const lista = `/estudos/${idEstudo}/candidatos`

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [candidato, setCandidato] = useState<Candidato | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [confirmando, setConfirmando] = useState(false)
  const [registrando, setRegistrando] = useState(false)

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
    return () => {
      ativo = false
    }
  }, [idEstudo, idCandidato])

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
            <Link to={`${lista}/${candidato.id}/editar`} className="botao botao--contorno">
              Editar dados
            </Link>
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
      {sucesso && (
        <div className="aviso aviso--sucesso" role="status">
          {sucesso}
        </div>
      )}

      {candidato && (
        <>
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

          <div className="detalhe__colunas">
            <CartaoConsentimento candidato={candidato} aoRegistrar={() => setConfirmando(true)} />
          </div>
        </>
      )}

      {confirmando && candidato && (
        <ConfirmacaoDialogo
          titulo="Registrar consentimento?"
          rotuloConfirmar="Confirmar registro"
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
    </div>
  )
}
