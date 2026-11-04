import '../../estilos/estudos.css'
import '../../estilos/usuarios.css'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROTULO_PERFIL } from '../auth/permissoes'
import type { Perfil } from '../auth/tipos'
import { dataHoraParaBR, iniciais } from './datas'
import type { UsuarioCadastrado } from './tipos'
import { listarUsuarios } from './usuariosService'

type FiltroStatus = 'todos' | 'ativos' | 'inativos'

function IconeBusca() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

export function UsuariosListaPage() {
  const [usuarios, setUsuarios] = useState<UsuarioCadastrado[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [filtroPerfil, setFiltroPerfil] = useState<Perfil | 'todos'>('todos')
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos')

  useEffect(() => {
    let ativo = true
    listarUsuarios()
      .then((dados) => {
        if (ativo) setUsuarios(dados)
      })
      .catch(() => {
        if (ativo) setErro('Não foi possível carregar os usuários. Verifique sua conexão.')
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })
    return () => {
      ativo = false
    }
  }, [])

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return usuarios.filter((u) => {
      if (filtroPerfil !== 'todos' && u.perfil !== filtroPerfil) return false
      if (filtroStatus === 'ativos' && !u.ativo) return false
      if (filtroStatus === 'inativos' && u.ativo) return false
      if (!termo) return true
      return [u.nome, u.email].some((campo) => campo.toLowerCase().includes(termo))
    })
  }, [usuarios, busca, filtroPerfil, filtroStatus])

  return (
    <div className="pagina">
      <div className="pagina__cabecalho">
        <div>
          <h1>Usuários</h1>
          <p className="pagina__subtitulo">
            Gerencie quem acessa o painel e o aplicativo, e com qual perfil.
          </p>
        </div>
        <Link to="/usuarios/novo" className="botao botao--primario">
          + Novo usuário
        </Link>
      </div>

      <div className="filtros">
        <div className="busca">
          <IconeBusca />
          <input
            className="pn-campo__entrada"
            type="search"
            placeholder="Buscar por nome ou e-mail"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <select
          className="pn-campo__entrada filtros__status"
          value={filtroPerfil}
          onChange={(e) => setFiltroPerfil(e.target.value as Perfil | 'todos')}
        >
          <option value="todos">Todos os perfis</option>
          {(Object.keys(ROTULO_PERFIL) as Perfil[]).map((perfil) => (
            <option key={perfil} value={perfil}>
              {ROTULO_PERFIL[perfil]}
            </option>
          ))}
        </select>
        <select
          className="pn-campo__entrada filtros__status"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
        >
          <option value="todos">Todos os status</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
        </select>
      </div>

      {erro && <div className="aviso aviso--erro">{erro}</div>}

      <div className="cartao cartao--tabela">
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Perfil</th>
              <th>Status</th>
              <th>Último acesso</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtrados.map((usuario) => (
              <tr key={usuario.id}>
                <td>
                  <div className="usuario-celula">
                    <span className="avatar" aria-hidden="true">
                      {iniciais(usuario.nome)}
                    </span>
                    <strong>{usuario.nome}</strong>
                  </div>
                </td>
                <td className="tabela__suave">{usuario.email}</td>
                <td>{ROTULO_PERFIL[usuario.perfil]}</td>
                <td>
                  <span className={usuario.ativo ? 'selo selo--ativo' : 'selo selo--inativo'}>
                    {usuario.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td className="tabela__suave">
                  {usuario.ultimoAcesso ? dataHoraParaBR(usuario.ultimoAcesso) : '—'}
                </td>
                <td className="tabela__acao">
                  <Link to={`/usuarios/${usuario.id}/editar`} className="link">
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {!carregando && filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="tabela__vazia">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
            {carregando && (
              <tr>
                <td colSpan={6} className="tabela__vazia">
                  Carregando usuários…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!carregando && (
        <p className="contagem">
          Mostrando {filtrados.length} de {usuarios.length} usuários
        </p>
      )}
    </div>
  )
}
