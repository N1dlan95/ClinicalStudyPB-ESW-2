import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../auth/AuthContext'
import { temPermissao, type Permissao } from '../auth/permissoes'

export type AbaEstudo = 'dados' | 'criterios' | 'visitas' | 'estado' | 'agenda'

export function AbasEstudo({ estudoId, ativa }: { estudoId: number; ativa: AbaEstudo }) {
  const auth = useContext(AuthContext)
  const perfil = auth?.usuario?.perfil ?? null
  const pode = (permissao: Permissao) => temPermissao(perfil, permissao)
  const classe = (aba: AbaEstudo) =>
    aba === ativa ? 'abas-estudo__item abas-estudo__item--ativo' : 'abas-estudo__item'

  return (
    <nav className="abas-estudo" aria-label="Seções do estudo">
      {pode('editarEstudos') && (
        <Link to={`/estudos/${estudoId}/editar`} className={classe('dados')}>
          Dados do estudo
        </Link>
      )}
      <Link to={`/estudos/${estudoId}/criterios`} className={classe('criterios')}>
        Critérios de elegibilidade
      </Link>
      {pode('editarEstudos') && (
        <>
          <Link to={`/estudos/${estudoId}/visitas-previstas`} className={classe('visitas')}>
            Visitas previstas
          </Link>
          <Link to={`/estudos/${estudoId}/estado`} className={classe('estado')}>
            Estado do estudo
          </Link>
        </>
      )}
      {pode('gerenciarCandidatos') && (
        <Link to={`/estudos/${estudoId}/candidatos`} className="abas-estudo__item">
          Candidatos
        </Link>
      )}
      <Link to={`/estudos/${estudoId}/agenda`} className={classe('agenda')}>
        Agenda do estudo
      </Link>
    </nav>
  )
}
