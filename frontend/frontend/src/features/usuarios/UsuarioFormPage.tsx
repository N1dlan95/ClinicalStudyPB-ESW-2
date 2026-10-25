import '../../estilos/estudos.css'
import '../../estilos/usuarios.css'
import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { isoParaBR } from '../estudos/datas'
import { ROTULO_PERFIL } from '../auth/permissoes'
import type { Perfil } from '../auth/tipos'
import { dataHoraParaBR } from './datas'
import { DESCRICAO_PERFIL, type FormularioUsuario, type UsuarioCadastrado } from './tipos'
import { atualizarUsuario, buscarUsuario, criarUsuario } from './usuariosService'

const FORMULARIO_VAZIO: FormularioUsuario = {
  nome: '',
  email: '',
  perfil: '',
  enviarConvite: true,
}

function Campo({
  rotulo,
  obrigatorio,
  dica,
  children,
}: {
  rotulo: string
  obrigatorio?: boolean
  dica?: string
  children: ReactNode
}) {
  return (
    <label className="pn-campo">
      <span className="pn-campo__rotulo">
        {rotulo}
        {obrigatorio && ' *'}
      </span>
      {children}
      {dica && <span className="pn-campo__dica">{dica}</span>}
    </label>
  )
}

export function UsuarioFormPage() {
  const { id } = useParams<{ id: string }>()
  const navegar = useNavigate()
  const edicao = Boolean(id)

  const [form, setForm] = useState<FormularioUsuario>(FORMULARIO_VAZIO)
  const [usuario, setUsuario] = useState<UsuarioCadastrado | null>(null)
  const [mensagemErro, setMensagemErro] = useState('')
  const [carregando, setCarregando] = useState(edicao)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!id) return
    let ativo = true
    buscarUsuario(Number(id))
      .then((existente) => {
        if (!ativo) return
        setUsuario(existente)
        setForm({ ...FORMULARIO_VAZIO, nome: existente.nome, email: existente.email, perfil: existente.perfil })
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
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    setMensagemErro('')

    const dados = {
      nome: form.nome.trim(),
      email: form.email.trim(),
      perfil: form.perfil as Perfil,
      ...(edicao ? {} : { enviarConvite: form.enviarConvite }),
    }

    setSalvando(true)
    try {
      if (id) await atualizarUsuario(Number(id), dados)
      else await criarUsuario(dados)
      navegar('/usuarios')
    } catch {
      setMensagemErro(
        edicao
          ? 'Não foi possível salvar as alterações. Tente novamente.'
          : 'Não foi possível cadastrar o usuário. Tente novamente.',
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
          Cadastrado em {isoParaBR(usuario.criadoEm)} ·{' '}
          {usuario.ultimoAcesso
            ? `Último acesso ${dataHoraParaBR(usuario.ultimoAcesso, ' às ')}`
            : 'Nunca acessou'}
        </p>
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
            <Campo rotulo="Nome completo" obrigatorio>
              <input
                className="pn-campo__entrada"
                placeholder="Nome e sobrenome"
                value={form.nome}
                onChange={(e) => alterar('nome', e.target.value)}
              />
            </Campo>
            <Campo
              rotulo="E-mail"
              obrigatorio
              dica={edicao ? 'Alterar o e-mail muda o login do usuário.' : 'Usado para login. Precisa ser único.'}
            >
              <input
                className="pn-campo__entrada"
                type="email"
                placeholder="nome@instituicao.br"
                value={form.email}
                onChange={(e) => alterar('email', e.target.value)}
              />
            </Campo>
          </div>
        </section>

        <section>
          <h2>Perfil de acesso *</h2>
          <p className="formulario__descricao">
            {edicao ? 'A mudança vale a partir do próximo login.' : 'Define o que o usuário pode ver e fazer.'}
          </p>
          <fieldset className="perfis">
            <legend className="sr-only">Perfil de acesso</legend>
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
          </fieldset>
        </section>

        {!edicao && (
          <section>
            <h2>Acesso</h2>
            <label className="caixa-marcar">
              <input
                type="checkbox"
                checked={form.enviarConvite}
                onChange={(e) => alterar('enviarConvite', e.target.checked)}
              />
              Enviar convite por e-mail para o usuário criar a própria senha
            </label>
          </section>
        )}

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
