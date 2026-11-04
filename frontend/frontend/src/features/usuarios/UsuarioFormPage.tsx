import '../../estilos/estudos.css'
import '../../estilos/usuarios.css'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { isoParaBR } from '../estudos/datas'
import { ROTULO_PERFIL } from '../auth/permissoes'
import type { Perfil } from '../auth/tipos'
import { useAuth } from '../auth/useAuth'
import { dataHoraParaBR } from './datas'
import {
  DESCRICAO_PERFIL,
  type CampoUsuario,
  type ErrosUsuario,
  type FormularioUsuario,
  type UsuarioCadastrado,
} from './tipos'
import {
  EmailDuplicadoError,
  atualizarUsuario,
  buscarUsuario,
  criarUsuario,
  enviarLinkRedefinicaoSenha,
} from './usuariosService'
import {
  MENSAGEM_EMAIL_DUPLICADO,
  ORDEM_CAMPOS,
  ROTULO_CAMPO,
  SENHA_MINIMO,
  validarUsuario,
} from './validacao'

const FORMULARIO_VAZIO: FormularioUsuario = {
  nome: '',
  email: '',
  perfil: '',
  ativo: true,
  senha: '',
}

// O texto de ajuda (erro ou dica) fica ligado ao campo pelo aria-describedby
function Campo({
  id,
  rotulo,
  obrigatorio,
  erro,
  dica,
  acao,
  children,
}: {
  id: string
  rotulo: string
  obrigatorio?: boolean
  erro?: string
  dica?: string
  acao?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="pn-campo">
      <label htmlFor={id} className="pn-campo__rotulo">
        {rotulo}
        {obrigatorio && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {erro ? (
        <span id={`${id}-ajuda`} className="pn-campo__erro">
          {erro}
        </span>
      ) : (
        dica && (
          <span id={`${id}-ajuda`} className="pn-campo__dica">
            {dica}
          </span>
        )
      )}
      {erro && acao}
    </div>
  )
}

function classeEntrada(erro?: string) {
  return erro ? 'pn-campo__entrada pn-campo__entrada--erro' : 'pn-campo__entrada'
}

export function UsuarioFormPage() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const { usuario: usuarioLogado } = useAuth()
  const edicao = Boolean(id)
  const proprioUsuario = edicao && usuarioLogado?.id === Number(id)

  const [form, setForm] = useState<FormularioUsuario>(FORMULARIO_VAZIO)
  const [usuario, setUsuario] = useState<UsuarioCadastrado | null>(null)
  const [erros, setErros] = useState<ErrosUsuario>({})
  const [idEmailExistente, setIdEmailExistente] = useState<number | null>(null)
  const [mensagemErro, setMensagemErro] = useState('')
  const [mensagemSenha, setMensagemSenha] = useState('')
  const [carregando, setCarregando] = useState(edicao)
  const [salvando, setSalvando] = useState(false)
  const [enviandoLink, setEnviandoLink] = useState(false)

  useEffect(() => {
    if (!id) return
    let ativo = true
    buscarUsuario(Number(id))
      .then((existente) => {
        if (!ativo) return
        setUsuario(existente)
        setForm({
          ...FORMULARIO_VAZIO,
          nome: existente.nome,
          email: existente.email,
          perfil: existente.perfil,
          ativo: existente.ativo,
        })
      })
      .catch(() => {
        if (ativo) setMensagemErro('Não foi possível carregar o usuário. Tente novamente.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [id])

  function alterar<C extends keyof FormularioUsuario>(campo: C, valor: FormularioUsuario[C]) {
    setForm((atual) => ({ ...atual, [campo]: valor }))
    // some com o erro do campo assim que a pessoa volta a mexer nele
    setErros((atuais) => {
      if (!(campo in atuais)) return atuais
      const proximos = { ...atuais }
      delete proximos[campo as CampoUsuario]
      return proximos
    })
    if (campo === 'email') setIdEmailExistente(null)
  }

  const acaoFalhou = edicao ? 'Não foi possível salvar as alterações.' : 'Não foi possível cadastrar o usuário.'

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setMensagemErro('')

    const encontrados = validarUsuario(form, edicao)
    setErros(encontrados)
    const camposComErro = ORDEM_CAMPOS.filter((c) => encontrados[c])
    if (camposComErro.length === 1) setMensagemErro(`${acaoFalhou} Corrija o campo destacado.`)
    if (camposComErro.length > 0) return

    const dados = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      perfil: form.perfil as Perfil,
      ativo: form.ativo,
      ...(edicao ? {} : { senha: form.senha }),
    }

    setSalvando(true)
    try {
      if (id) await atualizarUsuario(Number(id), dados)
      else await criarUsuario(dados)
      navegar('/usuarios')
    } catch (erro) {
      if (erro instanceof EmailDuplicadoError) {
        setErros({ email: MENSAGEM_EMAIL_DUPLICADO })
        setIdEmailExistente(erro.usuarioExistenteId)
        setMensagemErro(`${acaoFalhou} Corrija o campo destacado.`)
      } else {
        setMensagemErro(`${acaoFalhou} Tente novamente.`)
      }
    } finally {
      setSalvando(false)
    }
  }

  async function enviarLinkSenha() {
    if (!id) return
    setMensagemSenha('')
    setEnviandoLink(true)
    try {
      await enviarLinkRedefinicaoSenha(Number(id))
      setMensagemSenha(`Link enviado para ${usuario?.email ?? form.email}.`)
    } catch {
      setMensagemSenha('Não foi possível enviar o link. Tente novamente.')
    } finally {
      setEnviandoLink(false)
    }
  }

  if (carregando) {
    return (
      <div className="pagina">
        <p>Carregando…</p>
      </div>
    )
  }

  const camposComErro = ORDEM_CAMPOS.filter((c) => erros[c])

  return (
    <div className="pagina pagina--formulario">
      <nav className="migalhas">
        <Link to="/usuarios">Usuários</Link> / {edicao ? (usuario?.nome ?? 'Editar') : 'Novo usuário'}
      </nav>
      <div className="titulo-com-selo">
        <h1>{edicao ? 'Editar usuário' : 'Novo usuário'}</h1>
        {usuario && (
          <span className={usuario.ativo ? 'selo selo--ativo' : 'selo selo--inativo'}>
            {usuario.ativo ? 'Ativo' : 'Inativo'}
          </span>
        )}
      </div>
      {usuario && (
        <p className="pagina__meta">
          Cadastrado em {usuario.criadoEm ? isoParaBR(usuario.criadoEm) : '—'} · Último acesso{' '}
          {usuario.ultimoAcesso ? dataHoraParaBR(usuario.ultimoAcesso, ' às ') : '—'}
        </p>
      )}

      {camposComErro.length > 1 && (
        <div className="aviso aviso--erro" role="alert">
          <strong>
            Corrija {camposComErro.length} campos para {edicao ? 'salvar' : 'cadastrar'} o usuário:
          </strong>
          <ul>
            {camposComErro.map((campo) => (
              <li key={campo}>{ROTULO_CAMPO[campo]}</li>
            ))}
          </ul>
        </div>
      )}
      {mensagemErro && (
        <div className="aviso aviso--erro" role="alert">
          {mensagemErro}
        </div>
      )}

      <form className="cartao formulario" onSubmit={enviar} noValidate>
        <section>
          <h2>Dados pessoais</h2>
          <div className="formulario__grade">
            <Campo id="nome" rotulo="Nome completo" obrigatorio erro={erros.nome}>
              <input
                id="nome"
                className={classeEntrada(erros.nome)}
                placeholder="Nome e sobrenome"
                value={form.nome}
                onChange={(e) => alterar('nome', e.target.value)}
                aria-invalid={!!erros.nome}
                aria-describedby={erros.nome ? 'nome-ajuda' : undefined}
              />
            </Campo>
            <Campo
              id="email"
              rotulo="E-mail"
              obrigatorio
              erro={erros.email}
              dica={edicao ? 'Alterar o e-mail muda o login do usuário.' : 'Usado para login. Precisa ser único.'}
              acao={
                idEmailExistente !== null && (
                  <Link to={`/usuarios/${idEmailExistente}/editar`} className="link link--forte">
                    Ver usuário existente
                  </Link>
                )
              }
            >
              <input
                id="email"
                className={classeEntrada(erros.email)}
                type="email"
                placeholder="nome@instituicao.br"
                value={form.email}
                onChange={(e) => alterar('email', e.target.value)}
                aria-invalid={!!erros.email}
                aria-describedby="email-ajuda"
              />
            </Campo>
          </div>
        </section>

        <section>
          <h2 id="perfil-titulo">
            Perfil de acesso <span aria-hidden="true">*</span>
          </h2>
          <p className="formulario__descricao">
            {edicao ? 'A mudança vale a partir do próximo login.' : 'Define o que o usuário pode ver e fazer.'}
          </p>
          <div
            className="perfis"
            role="radiogroup"
            aria-labelledby="perfil-titulo"
            aria-describedby={erros.perfil ? 'perfil-ajuda' : undefined}
          >
            {(Object.keys(ROTULO_PERFIL) as Perfil[]).map((perfil) => (
              <label
                key={perfil}
                className={
                  form.perfil === perfil ? 'perfil-opcao perfil-opcao--selecionado' : 'perfil-opcao'
                }
              >
                <input
                  type="radio"
                  name="perfil"
                  value={perfil}
                  checked={form.perfil === perfil}
                  onChange={() => alterar('perfil', perfil)}
                />
                <span>
                  <strong>{ROTULO_PERFIL[perfil]}</strong>
                  <small>{DESCRICAO_PERFIL[perfil]}</small>
                </span>
              </label>
            ))}
          </div>
          {erros.perfil && (
            <span id="perfil-ajuda" className="pn-campo__erro perfis__erro">
              {erros.perfil}
            </span>
          )}
        </section>

        <section>
          <h2>Acesso</h2>
          {edicao ? (
            <div className="formulario__grade">
              <Campo
                id="status"
                rotulo="Status"
                dica={
                  proprioUsuario
                    ? 'Você não pode desativar o próprio usuário.'
                    : 'Usuários inativos não conseguem entrar.'
                }
              >
                <select
                  id="status"
                  className="pn-campo__entrada"
                  value={form.ativo ? 'ativo' : 'inativo'}
                  onChange={(e) => alterar('ativo', e.target.value === 'ativo')}
                  disabled={proprioUsuario}
                  aria-describedby="status-ajuda"
                >
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </Campo>
              <div className="pn-campo">
                <span className="pn-campo__rotulo">Senha</span>
                <div>
                  <button
                    type="button"
                    className="botao botao--contorno"
                    onClick={enviarLinkSenha}
                    disabled={enviandoLink}
                  >
                    {enviandoLink ? 'Enviando…' : 'Enviar link para redefinir senha'}
                  </button>
                </div>
                {mensagemSenha && (
                  <span className="pn-campo__dica" role="status">
                    {mensagemSenha}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="caixas">
              <div className="formulario__grade">
                <Campo
                  id="senha"
                  rotulo="Senha"
                  obrigatorio
                  erro={erros.senha}
                  dica={`Mínimo de ${SENHA_MINIMO} caracteres.`}
                >
                  <input
                    id="senha"
                    className={classeEntrada(erros.senha)}
                    type="password"
                    autoComplete="new-password"
                    value={form.senha}
                    onChange={(e) => alterar('senha', e.target.value)}
                    aria-invalid={!!erros.senha}
                    aria-describedby="senha-ajuda"
                  />
                </Campo>
              </div>
              <label className="caixa-marcar">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => alterar('ativo', e.target.checked)}
                />
                Usuário ativo
              </label>
            </div>
          )}
        </section>

        <footer className="formulario__rodape formulario__rodape--direita">
          <div className="formulario__acoes">
            <button type="button" className="botao botao--contorno" onClick={() => navegar('/usuarios')}>
              Cancelar
            </button>
            <button type="submit" className="botao botao--primario" disabled={salvando}>
              {salvando ? 'Salvando…' : edicao ? 'Salvar alterações' : 'Cadastrar usuário'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  )
}
