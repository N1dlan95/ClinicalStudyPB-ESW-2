// Regras de acesso do painel web (task 3222).
import type { Perfil } from './tipos'

export type Permissao =
  | 'verEstudos'
  | 'criarEstudos'
  | 'editarEstudos'
  | 'gerenciarUsuarios'

export const ROTULO_PERFIL: Record<Perfil, string> = {
  ADMINISTRADOR: 'Administrador',
  COORDENADOR: 'Coordenador',
  PESQUISADOR: 'Pesquisador',
  PARTICIPANTE: 'Participante',
}

// Texto usado na tela de "Acesso negado": "não tem permissão para <descrição>"
export const DESCRICAO_PERMISSAO: Record<Permissao, string> = {
  verEstudos: 'ver os estudos',
  criarEstudos: 'cadastrar estudos',
  editarEstudos: 'editar estudos',
  gerenciarUsuarios: 'gerenciar usuários',
}

const PERMISSOES_POR_PERFIL: Record<Perfil, Permissao[]> = {
  ADMINISTRADOR: ['verEstudos', 'criarEstudos', 'editarEstudos', 'gerenciarUsuarios'],
  COORDENADOR: ['verEstudos', 'criarEstudos', 'editarEstudos'],
  PESQUISADOR: ['verEstudos'],
  // Participante usa só o aplicativo móvel: nenhuma permissão no painel web
  PARTICIPANTE: [],
}

export function temPermissao(perfil: Perfil | null | undefined, permissao: Permissao): boolean {
  if (!perfil) return false
  // O "?? []" protege contra um perfil novo vindo do backend que o front ainda não conhece
  return (PERMISSOES_POR_PERFIL[perfil] ?? []).includes(permissao)
}
