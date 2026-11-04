import type { Credenciais } from './types';

export interface ErrosLogin {
  email?: string;
  senha?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validarCredenciais({ email, senha }: Credenciais): ErrosLogin {
  const erros: ErrosLogin = {};

  if (!email.trim()) {
    erros.email = 'Informe o e-mail.';
  } else if (!EMAIL_REGEX.test(email.trim())) {
    erros.email = 'E-mail inválido.';
  }

  if (!senha) {
    erros.senha = 'Informe a senha.';
  }

  return erros;
}

export function temErros(erros: ErrosLogin): boolean {
  return Object.keys(erros).length > 0;
}
