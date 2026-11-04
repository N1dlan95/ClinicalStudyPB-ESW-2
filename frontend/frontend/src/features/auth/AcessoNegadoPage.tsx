import { useNavigate } from 'react-router-dom'
import { DESCRICAO_PERMISSAO, type Permissao } from './permissoes'
import { useAutorizacao } from './useAutorizacao'

export function AcessoNegadoPage({ permissao }: { permissao: Permissao }) {
  const navegar = useNavigate()
  const { rotuloPerfil, sair, pode } = useAutorizacao()

  function entrarComOutraConta() {
    sair()
    navegar('/login', { replace: true })
  }

  return (
    <div className="acesso-negado">
      <div className="acesso-negado__cartao">
        <div className="acesso-negado__icone" aria-hidden="true">
          🔒
        </div>
        <h1>Acesso negado</h1>
        <p>
          Seu perfil <strong>{rotuloPerfil || 'atual'}</strong> não tem permissão para{' '}
          {DESCRICAO_PERMISSAO[permissao]}. Se precisar desse acesso, fale com um
          administrador do sistema.
        </p>
        <div className="acesso-negado__acoes">
          {pode('verEstudos') && (
            <button className="botao botao--primario" onClick={() => navegar('/estudos')}>
              Ir para Estudos
            </button>
          )}
          <button className="botao botao--contorno" onClick={entrarComOutraConta}>
            Entrar com outra conta
          </button>
        </div>
        <small>Código: 403 · Sem permissão</small>
      </div>
    </div>
  )
}
