import '../../estilos/estudos.css'
import '../../estilos/candidatos.css'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { brParaIso, isoParaBR, mascaraData } from '../estudos/datas'
import { buscarEstudo } from '../estudos/estudosService'
import type { Estudo } from '../estudos/tipos'
import { atualizarCandidato, buscarCandidato, criarCandidato, traduzirErro } from './candidatosService'
import {
  ROTULO_STATUS_CANDIDATO,
  type CampoCandidato,
  type Candidato,
  type ErrosCandidato,
  type FormularioCandidato,
} from './tipos'
import { NOME_MAX, ORDEM_CAMPOS, ROTULO_CAMPO, mascaraTelefone, validarCandidato } from './validacao'

const VAZIO: FormularioCandidato = { nome: '', email: '', telefone: '', dataNascimento: '' }

function Campo({
  id,
  rotulo,
  obrigatorio,
  erro,
  dica,
  children,
}: {
  id: string
  rotulo: string
  obrigatorio?: boolean
  erro?: string
  dica?: string
  children: ReactNode
}) {
  return (
    <div className="pn-campo">
      <label className="pn-campo__rotulo" htmlFor={id}>
        {rotulo}
        {obrigatorio && ' *'}
      </label>
      {children}
      {erro ? (
        <span className="pn-campo__erro" id={`${id}-erro`}>
          {erro}
        </span>
      ) : (
        dica && <span className="pn-campo__dica">{dica}</span>
      )}
    </div>
  )
}

const classe = (erro?: string) => (erro ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada')

export function CandidatoFormPage() {
  const { estudoId, id } = useParams<{ estudoId: string; id: string }>()
  const idEstudo = Number(estudoId)
  const edicao = Boolean(id)
  const navegar = useNavigate()
  const voltar = `/estudos/${idEstudo}/candidatos`

  const [estudo, setEstudo] = useState<Estudo | null>(null)
  const [candidato, setCandidato] = useState<Candidato | null>(null)
  const [form, setForm] = useState<FormularioCandidato>(VAZIO)
  const [erros, setErros] = useState<ErrosCandidato>({})
  const [mensagemErro, setMensagemErro] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let ativo = true
    async function carregar() {
      try {
        const e = await buscarEstudo(idEstudo)
        const c = id ? await buscarCandidato(idEstudo, Number(id)) : null
        if (!ativo) return
        setEstudo(e)
        if (c) {
          setCandidato(c)
          setForm({
            nome: c.nome,
            email: c.email,
            telefone: c.telefone ? mascaraTelefone(c.telefone) : '',
            dataNascimento: isoParaBR(c.dataNascimento),
          })
        }
      } catch (erro) {
        if (ativo) setMensagemErro(`Não foi possível carregar os dados. ${traduzirErro(erro).message}`)
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    carregar()
    return () => {
      ativo = false
    }
  }, [idEstudo, id])

  function alterar(campo: CampoCandidato, valor: string) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
    setErros((atuais) => {
      if (!atuais[campo]) return atuais
      const proximos = { ...atuais }
      delete proximos[campo]
      return proximos
    })
  }

  function mostrarErros(encontrados: ErrosCandidato) {
    setErros(encontrados)
    const comErro = ORDEM_CAMPOS.filter((c) => encontrados[c])
    if (comErro.length === 1) {
      setMensagemErro(`Corrija o campo destacado para ${edicao ? 'salvar' : 'cadastrar'} o candidato.`)
    }
    return comErro.length
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setMensagemErro('')
    if (mostrarErros(validarCandidato(form)) > 0) return

    const telefone = form.telefone.replace(/\D/g, '')
    const dados = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      telefone: telefone ? form.telefone.trim() : null,
      dataNascimento: brParaIso(form.dataNascimento) ?? '',
    }

    setSalvando(true)
    try {
      if (id) {
        await atualizarCandidato(idEstudo, Number(id), dados)
        navegar(`${voltar}/${id}`)
      } else {
        await criarCandidato(idEstudo, dados)
        navegar(voltar)
      }
    } catch (erro) {
      const erroApi = traduzirErro(erro)
      if (mostrarErros(erroApi.errosCampos) > 0) return
      setMensagemErro(
        `${edicao ? 'Não foi possível salvar as alterações.' : 'Não foi possível cadastrar o candidato.'} ${erroApi.message}`,
      )
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="pagina">
        <p>Carregando…</p>
      </div>
    )
  }

  // Cadastro só com o estudo em RECRUTAMENTO (regra da task 3558); a edição continua liberada
  const bloqueado = !edicao && estudo !== null && estudo.estado !== 'RECRUTAMENTO'
  const comErro = ORDEM_CAMPOS.filter((c) => erros[c])
  const ariaErro = (c: CampoCandidato) =>
    erros[c] ? { 'aria-invalid': true, 'aria-describedby': `candidato-${c}-erro` } : {}

  return (
    <div className="pagina pagina--formulario">
      <nav className="migalhas">
        <Link to="/estudos">Estudos</Link> / <Link to={voltar}>{estudo?.titulo ?? 'Candidatos'}</Link> /{' '}
        {edicao ? (candidato?.nome ?? 'Editar') : 'Novo candidato'}
      </nav>
      <div className="titulo-com-selo">
        <h1>{edicao ? 'Editar candidato' : 'Novo candidato'}</h1>
        {candidato && (
          <span className={`selo selo--candidato-${candidato.status.toLowerCase()}`}>
            {ROTULO_STATUS_CANDIDATO[candidato.status]}
          </span>
        )}
      </div>
      {!edicao && <p className="pagina__subtitulo">O candidato entra com o status Cadastrado.</p>}

      {comErro.length > 1 && (
        <div className="aviso aviso--erro" role="alert">
          <strong>
            Corrija {comErro.length} campos para {edicao ? 'salvar' : 'cadastrar'} o candidato:
          </strong>
          <ul>
            {comErro.map((c) => (
              <li key={c}>{ROTULO_CAMPO[c]}</li>
            ))}
          </ul>
        </div>
      )}
      {mensagemErro && (
        <div className="aviso aviso--erro" role="alert">
          {mensagemErro}
        </div>
      )}
      {bloqueado && estudo && (
        <div className="aviso aviso--atencao" role="status">
          Estudo fora de recrutamento: o cadastro de candidatos só fica liberado quando o estudo estiver em
          Recrutamento.
        </div>
      )}

      <form className="cartao formulario" onSubmit={enviar} noValidate>
        <fieldset className="formulario__campos" disabled={bloqueado}>
          <section>
            <h2>Dados pessoais</h2>
            <div className="formulario__grade">
              <Campo id="candidato-nome" rotulo="Nome completo" obrigatorio erro={erros.nome}>
                <input
                  id="candidato-nome"
                  className={classe(erros.nome)}
                  maxLength={NOME_MAX}
                  value={form.nome}
                  onChange={(e) => alterar('nome', e.target.value)}
                  {...ariaErro('nome')}
                />
              </Campo>
              <Campo
                id="candidato-dataNascimento"
                rotulo="Data de nascimento"
                obrigatorio
                erro={erros.dataNascimento}
                dica="dd/mm/aaaa"
              >
                <input
                  id="candidato-dataNascimento"
                  className={classe(erros.dataNascimento)}
                  placeholder="dd/mm/aaaa"
                  inputMode="numeric"
                  value={form.dataNascimento}
                  onChange={(e) => alterar('dataNascimento', mascaraData(e.target.value))}
                  {...ariaErro('dataNascimento')}
                />
              </Campo>
              <Campo
                id="candidato-email"
                rotulo="E-mail"
                obrigatorio
                erro={erros.email}
                dica="Não pode repetir outro candidato deste estudo."
              >
                <input
                  id="candidato-email"
                  type="email"
                  className={classe(erros.email)}
                  value={form.email}
                  onChange={(e) => alterar('email', e.target.value)}
                  {...ariaErro('email')}
                />
              </Campo>
              <Campo id="candidato-telefone" rotulo="Telefone" erro={erros.telefone} dica="Opcional, com DDD.">
                <input
                  id="candidato-telefone"
                  className={classe(erros.telefone)}
                  placeholder="(83) 99999-0000"
                  inputMode="tel"
                  value={form.telefone}
                  onChange={(e) => alterar('telefone', mascaraTelefone(e.target.value))}
                  {...ariaErro('telefone')}
                />
              </Campo>
            </div>
          </section>
        </fieldset>

        <footer className="formulario__rodape">
          <small>* Campos obrigatórios</small>
          <div className="formulario__acoes">
            <button type="button" className="botao botao--contorno" onClick={() => navegar(voltar)}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--primario" disabled={salvando || bloqueado}>
              {salvando ? 'Salvando…' : edicao ? 'Salvar alterações' : 'Cadastrar candidato'}
            </button>
          </div>
        </footer>
      </form>

      <footer className="pagina__rodape">
        <Link to={edicao ? `${voltar}/${id}` : voltar} className="botao botao--contorno">
          {edicao ? 'Voltar ao candidato' : 'Voltar à lista'}
        </Link>
      </footer>
    </div>
  )
}
