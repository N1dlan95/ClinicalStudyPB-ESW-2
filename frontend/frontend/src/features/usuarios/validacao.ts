import { FORMATO_EMAIL } from '../auth/validacao'
import type { CampoUsuario, ErrosUsuario, FormularioUsuario } from './tipos'

// Nomes exibidos na lista do aviso "Corrija N campos..."
export const ROTULO_CAMPO: Record<CampoUsuario, string> = {
  nome: 'Nome completo',
  email: 'E-mail',
  perfil: 'Perfil de acesso',
  senha: 'Senha',
}

// Ordem em que os campos aparecem na tela (e no aviso)
export const ORDEM_CAMPOS: CampoUsuario[] = ['nome', 'email', 'perfil', 'senha']

export const MENSAGEM_EMAIL_DUPLICADO = 'Este e-mail já está cadastrado para outro usuário.'

// Mesmos limites do backend (UsuarioCriacaoRequest)
export const SENHA_MINIMO = 8
const SENHA_MAXIMO = 72

// A senha só é exigida no cadastro: na edição ela não muda por este formulário
export function validarUsuario(form: FormularioUsuario, edicao = false): ErrosUsuario {
  const erros: ErrosUsuario = {}

  const nome = form.nome.trim()
  if (!nome) erros.nome = 'Informe o nome completo.'
  else if (nome.split(/\s+/).length < 2) erros.nome = 'Informe nome e sobrenome.'

  const email = form.email.trim()
  if (!email) erros.email = 'Informe o e-mail.'
  else if (!FORMATO_EMAIL.test(email)) erros.email = 'Informe um e-mail válido.'

  if (!form.perfil) erros.perfil = 'Selecione o perfil de acesso.'

  if (!edicao) {
    if (!form.senha) erros.senha = 'Informe a senha.'
    else if (form.senha.length < SENHA_MINIMO) erros.senha = `A senha deve ter pelo menos ${SENHA_MINIMO} caracteres.`
    else if (form.senha.length > SENHA_MAXIMO) erros.senha = `A senha deve ter no máximo ${SENHA_MAXIMO} caracteres.`
  }

  return erros
}
