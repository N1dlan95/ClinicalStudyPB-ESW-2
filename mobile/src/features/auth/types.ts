export type Perfil = 'PARTICIPANTE' | 'PESQUISADOR' | 'COORDENADOR' | 'ADMINISTRADOR';

export interface Usuario {
  id: number;
  nome: string;
  email: string;
  perfil: Perfil;
}

export interface Sessao {
  token: string;
  usuario: Usuario;
}

export interface Credenciais {
  email: string;
  senha: string;
}
