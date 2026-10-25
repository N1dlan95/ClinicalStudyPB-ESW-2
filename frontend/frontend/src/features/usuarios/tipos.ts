import type { Perfil } from '../auth/tipos'

// Texto que aparece embaixo de cada perfil no formulário (Figma 3107)
export const DESCRICAO_PERFIL: Record<Perfil, string> = {
  ADMINISTRADOR: 'Gerencia usuários, perfis e todos os estudos.',
  COORDENADOR: 'Cria e edita estudos, inclui participantes e agenda visitas.',
  PESQUISADOR: 'Acompanha os estudos em que é responsável.',
  PARTICIPANTE: 'Acessa só o aplicativo móvel: estudos, visitas e perfil.',
}

export interface UsuarioCadastrado {
  id: number
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  criadoEm: string // ISO: aaaa-mm-dd
  ultimoAcesso: string | null // ISO: aaaa-mm-ddThh:mm
}

// Dados enviados ao criar/editar. Sem senha: o usuário cria a própria pelo convite
export interface UsuarioEntrada {
  nome: string
  email: string
  perfil: Perfil
  enviarConvite?: boolean
}

// Estado dos campos do formulário (como o usuário preenche)
export interface FormularioUsuario {
  nome: string
  email: string
  perfil: Perfil | ''
  enviarConvite: boolean
}
