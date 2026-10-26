import { FORMATO_EMAIL } from '../auth/validacao'
import type { CampoUsuario, ErrosUsuario, FormularioUsuario } from './tipos'

// Nomes exibidos na lista do aviso "Corrija N campos..."
export const ROTULO_CAMPO: Record<CampoUsuario, string> = {
  nome: 'Nome completo',
  email: 'E-mail',
  perfil: 'Perfil de acesso',
}

// Ordem em que os campos aparecem na tela (e no aviso)
export const ORDEM_CAMPOS: CampoUsuario[] = ['nome', 'email', 'perfil']

export const MENSAGEM_EMAIL_DUPLICADO = 'Este e-mail já está cadastrado para outro usuário.'

export function validarUsuario(form: FormularioUsuario): ErrosUsuario {
  const erros: ErrosUsuario = {}

  const nome = form.nome.trim()
  if (!nome) erros.nome = 'Informe o nome completo.'
  else if (nome.split(/\s+/).length < 2) erros.nome = 'Informe nome e sobrenome.'

  const email = form.email.trim()
  if (!email) erros.email = 'Informe o e-mail.'
  else if (!FORMATO_EMAIL.test(email)) erros.email = 'Informe um e-mail válido.'

  if (!form.perfil) erros.perfil = 'Selecione o perfil de acesso.'

  return erros
}
