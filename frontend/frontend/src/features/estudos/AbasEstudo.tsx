import { Link } from 'react-router-dom'
import { useAutorizacao } from '../auth/useAutorizacao'

export type AbaEstudo = 'dados' | 'criterios' | 'visitas' | 'estado'

export function AbasEstudo({ estudoId, ativa }: { estudoId: number; ativa: AbaEstudo }) {
  const { pode } = useAutorizacao()
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
    </nav>
  )
}
