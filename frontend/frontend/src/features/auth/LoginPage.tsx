import { useState, type FormEvent } from 'react'
import { ErroLogin, MENSAGEM_LOGIN, entrarNaApi } from './authService'
import { useAuth } from './useAuth'
import { validarLogin, type ErrosLogin } from './validacao'
import './LoginPage.css'

export function LoginPage() {
  const { entrar } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erros, setErros] = useState<ErrosLogin>({})
  const [mensagemErro, setMensagemErro] = useState('')
  const [entrando, setEntrando] = useState(false)

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setMensagemErro('')
    const novosErros = validarLogin(email, senha)
    setErros(novosErros)

    if (Object.keys(novosErros).length > 0) return

    setEntrando(true)
    try {
      // Ao salvar a sessão, a rota /login redireciona para o painel
      entrar(await entrarNaApi(email, senha))
    } catch (erro) {
      const erroLogin = erro instanceof ErroLogin ? erro : new ErroLogin(MENSAGEM_LOGIN.inesperado)
      setMensagemErro(erroLogin.message)
      if (erroLogin.senhaInvalida) setErros({ senha: 'Senha inválida.' })
      setEntrando(false)
    }
  }

  return (
    <div className="login">
      <aside className="login__painel">
        <div className="login__marca">
          <span className="login__logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 3h6M10 3v6l-5.5 9.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3" />
            </svg>
          </span>
          ClinicalStudyPB
        </div>

        <div className="login__chamada">
          <h2>Painel da equipe do estudo</h2>
          <p>Acompanhe o estudo clínico, organize a equipe e mantenha tudo em um só lugar.</p>
        </div>

        <p className="login__rodape">© 2026 ClinicalStudyPB</p>
        <div className="login__circulos" aria-hidden="true" />
      </aside>

      <main className="login__conteudo">
        <div className="login__area">
          <form className="login__cartao" onSubmit={handleSubmit} noValidate>
            <h1>Entrar</h1>
            <p className="login__subtitulo">Use seu e-mail e sua senha para continuar.</p>

            {mensagemErro && (
              <div className="login__alerta" role="alert">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" />
                </svg>
                {mensagemErro}
              </div>
            )}

            <div className="campo">
              <label htmlFor="email">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="seu@email.com"
                className={erros.email ? 'campo__input campo__input--erro' : 'campo__input'}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (erros.email) setErros({ ...erros, email: undefined })
                }}
                aria-invalid={!!erros.email}
                aria-describedby={erros.email ? 'email-erro' : undefined}
              />
              {erros.email && <p id="email-erro" className="campo__erro">{erros.email}</p>}
            </div>

            <div className="campo">
              <div className="campo__topo">
                <label htmlFor="senha">Senha</label>
                <a href="#" className="campo__link">Esqueci minha senha</a>
              </div>
              <input
                id="senha"
                type="password"
                autoComplete="current-password"
                placeholder="Sua senha"
                className={erros.senha ? 'campo__input campo__input--erro' : 'campo__input'}
                value={senha}
                onChange={(e) => {
                  setSenha(e.target.value)
                  if (erros.senha) setErros({ ...erros, senha: undefined })
                }}
                aria-invalid={!!erros.senha}
                aria-describedby={erros.senha ? 'senha-erro' : undefined}
              />
              {erros.senha && <p id="senha-erro" className="campo__erro">{erros.senha}</p>}
            </div>

            <button type="submit" className="login__botao" disabled={entrando}>
              {entrando ? 'Entrando…' : 'Entrar'}
            </button>
          </form>

          <p className="login__aviso">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
            Acesso restrito a administradores, coordenadores e pesquisadores. Participantes usam o aplicativo móvel.
          </p>
        </div>
      </main>
    </div>
  )
}
