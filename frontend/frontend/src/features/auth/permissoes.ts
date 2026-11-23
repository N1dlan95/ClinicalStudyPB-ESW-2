// Regras de acesso do painel web (task 3222).
import type { Perfil } from './tipos'

export type Permissao =
  | 'verEstudos'
  | 'criarEstudos'
  | 'editarEstudos'
  | 'gerenciarUsuarios'
  | 'gerenciarCandidatos'
  | 'verResultados'
  | 'registrarResultados'
  | 'verAcompanhamento'
  | 'registrarRetirada'

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
  gerenciarCandidatos: 'gerenciar candidatos',
  verResultados: 'ver os resultados das visitas',
  registrarResultados: 'registrar os resultados das visitas',
  verAcompanhamento: 'ver o histórico dos participantes',
  registrarRetirada: 'registrar a retirada de participantes',
}

// Igual ao backend (Perfil.java e SecurityConfig.java) e ao openapi.yaml: só o PESQUISADOR
// cadastra e edita estudos (US-04.1); administrador e coordenador apenas consultam.
// Candidatos (RF08): acesso do coordenador, como na task 3558 do backend.
// Resultados (RF14): pesquisador, coordenador e administrador consultam; só o coordenador registra.
const PERMISSOES_POR_PERFIL: Record<Perfil, Permissao[]> = {
  ADMINISTRADOR: ['verEstudos', 'gerenciarUsuarios', 'verResultados', 'verAcompanhamento'],
  COORDENADOR: ['verEstudos', 'gerenciarCandidatos', 'verResultados', 'registrarResultados', 'verAcompanhamento', 'registrarRetirada'],
  PESQUISADOR: ['verEstudos', 'criarEstudos', 'editarEstudos', 'verResultados', 'verAcompanhamento'],
  // Participante usa só o aplicativo móvel: nenhuma permissão no painel web
  PARTICIPANTE: [],
}

export function temPermissao(perfil: Perfil | null | undefined, permissao: Permissao): boolean {
  if (!perfil) return false
  // O "?? []" protege contra um perfil novo vindo do backend que o front ainda não conhece
  return (PERMISSOES_POR_PERFIL[perfil] ?? []).includes(permissao)
}
