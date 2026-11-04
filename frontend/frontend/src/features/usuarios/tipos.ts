import type { Perfil } from '../auth/tipos'

// Texto que aparece embaixo de cada perfil no formulário (Figma 3107, com as permissões do backend)
export const DESCRICAO_PERFIL: Record<Perfil, string> = {
  ADMINISTRADOR: 'Gerencia usuários, perfis e todos os estudos.',
  COORDENADOR: 'Acompanha os estudos, sem alterar os dados.',
  PESQUISADOR: 'Cria e edita estudos, inclui participantes e agenda visitas.',
  PARTICIPANTE: 'Acessa só o aplicativo móvel: estudos, visitas e perfil.',
}

export interface UsuarioCadastrado {
  id: number
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  // A API ainda não devolve as datas abaixo (pendente no backend): por enquanto chegam null
  criadoEm: string | null // ISO: aaaa-mm-dd
  ultimoAcesso: string | null // ISO: aaaa-mm-ddThh:mm
}

// Dados enviados ao criar/editar. A senha só vai no cadastro
export interface UsuarioEntrada {
  nome: string
  email: string
  perfil: Perfil
  ativo: boolean
  senha?: string
}

// Estado dos campos do formulário (como o usuário preenche)
export interface FormularioUsuario {
  nome: string
  email: string
  perfil: Perfil | ''
  ativo: boolean
  senha: string
}

export type CampoUsuario = 'nome' | 'email' | 'perfil' | 'senha'
export type ErrosUsuario = Partial<Record<CampoUsuario, string>>
