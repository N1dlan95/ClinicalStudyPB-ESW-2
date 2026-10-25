import { ROTULO_PERFIL, temPermissao, type Permissao } from './permissoes'
import { useAuth } from './useAuth'

// Camada fina sobre o useAuth: traduz o perfil do usuário logado em permissões.
export function useAutorizacao() {
  const { usuario, autenticado, sair } = useAuth()
  const perfil = usuario?.perfil ?? null

  return {
    autenticado,
    sair,
    nome: usuario?.nome ?? '',
    perfil,
    rotuloPerfil: perfil ? (ROTULO_PERFIL[perfil] ?? perfil) : '',
    pode: (permissao: Permissao) => temPermissao(perfil, permissao),
  }
}
