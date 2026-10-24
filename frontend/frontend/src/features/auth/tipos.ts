export type Perfil = 'ADMINISTRADOR' | 'COORDENADOR' | 'PESQUISADOR' | 'PARTICIPANTE'

export type Usuario = {
  id: number
  nome: string
  email: string
  perfil: Perfil
}

export type Sessao = {
  usuario: Usuario
  token: string
}
