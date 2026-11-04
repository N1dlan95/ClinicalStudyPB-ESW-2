import { brParaIso } from '../estudos/datas'
import type { CampoCandidato, ErrosCandidato, FormularioCandidato } from './tipos'

export const NOME_MIN = 3
export const NOME_MAX = 120

export const ROTULO_CAMPO: Record<CampoCandidato, string> = {
  nome: 'Nome completo',
  email: 'E-mail',
  telefone: 'Telefone',
  dataNascimento: 'Data de nascimento',
}

export const ORDEM_CAMPOS: CampoCandidato[] = ['nome', 'dataNascimento', 'email', 'telefone']

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// (83) 99999-0000 enquanto digita
export function mascaraTelefone(valor: string): string {
  const n = valor.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 2) return n.length ? `(${n}` : ''
  if (n.length <= 6) return `(${n.slice(0, 2)}) ${n.slice(2)}`
  if (n.length <= 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`
  return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`
}

// hoje no formato aaaa-mm-dd (horário local)
function hojeIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function validarCandidato(form: FormularioCandidato, hoje: string = hojeIso()): ErrosCandidato {
  const erros: ErrosCandidato = {}

  const nome = form.nome.trim()
  if (!nome) erros.nome = 'Informe o nome completo.'
  else if (nome.length < NOME_MIN || nome.length > NOME_MAX) {
    erros.nome = `O nome deve ter entre ${NOME_MIN} e ${NOME_MAX} caracteres.`
  }

  const email = form.email.trim()
  if (!email) erros.email = 'Informe o e-mail.'
  else if (!EMAIL_VALIDO.test(email)) erros.email = 'Informe um e-mail válido.'

  const digitos = form.telefone.replace(/\D/g, '')
  if (digitos && (digitos.length < 10 || digitos.length > 11)) {
    erros.telefone = 'Informe o telefone com DDD, ex.: (83) 99999-0000.'
  }

  if (!form.dataNascimento.trim()) erros.dataNascimento = 'Informe a data de nascimento.'
  else {
    const iso = brParaIso(form.dataNascimento)
    if (!iso) erros.dataNascimento = 'Data inválida. Use o formato dd/mm/aaaa.'
    else if (iso > hoje) erros.dataNascimento = 'A data de nascimento não pode ser no futuro.'
  }

  return erros
}
