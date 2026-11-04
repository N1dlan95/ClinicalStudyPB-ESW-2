import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import type { Permissao } from '../features/auth/permissoes'
import { useAutorizacao } from '../features/auth/useAutorizacao'
import '../estilos/painel.css'

interface ItemMenu {
  rotulo: string
  caminho: string
  permissao: Permissao
}

// O menu só mostra o que o perfil pode acessar (ex.: Pesquisador não vê "Usuários")
const ITENS_MENU: ItemMenu[] = [
  { rotulo: 'Estudos', caminho: '/estudos', permissao: 'verEstudos' },
  { rotulo: 'Usuários', caminho: '/usuarios', permissao: 'gerenciarUsuarios' },
]

function iniciais(nome: string) {
  const partes = nome.split(/[\s@.]+/).filter(Boolean)
  return partes
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

export function LayoutPrincipal() {
  const navegar = useNavigate()
  const { nome, rotuloPerfil, pode, sair } = useAutorizacao()

  function aoSair() {
    sair()
    navegar('/login', { replace: true })
  }

  return (
    <div className="painel">
      <aside className="painel__lateral">
        <div className="marca">
          <span className="marca__icone" aria-hidden="true">
            ⚗
          </span>
          <div>
            <strong>ClinicalStudyPB</strong>
            <small>Painel da equipe</small>
          </div>
        </div>

        <nav className="menu" aria-label="Menu principal">
          {ITENS_MENU.filter((item) => pode(item.permissao)).map((item) => (
            <NavLink
              key={item.caminho}
              to={item.caminho}
              className={({ isActive }) => (isActive ? 'menu__item menu__item--ativo' : 'menu__item')}
            >
              {item.rotulo}
            </NavLink>
          ))}
        </nav>

        <div className="painel__rodape">
          <div className="usuario-logado">
            <span className="avatar">{iniciais(nome) || '?'}</span>
            <div>
              <strong>{nome}</strong>
              <small>{rotuloPerfil}</small>
            </div>
          </div>
          <button className="menu__item menu__sair" onClick={aoSair}>
            Sair
          </button>
        </div>
      </aside>

      <main className="painel__conteudo">
        <Outlet />
      </main>
    </div>
  )
}
