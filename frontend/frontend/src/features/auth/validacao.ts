export type ErrosLogin = {
  email?: string
  senha?: string
}

export const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarLogin(email: string, senha: string): ErrosLogin {
  const erros: ErrosLogin = {}

  if (!email.trim()) {
    erros.email = 'Informe o e-mail.'
  } else if (!FORMATO_EMAIL.test(email.trim())) {
    erros.email = 'Informe um e-mail válido.'
  }

  if (!senha) {
    erros.senha = 'Informe a senha.'
  }

  return erros
}
