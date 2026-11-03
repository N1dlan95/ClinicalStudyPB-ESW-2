import { describe, expect, it } from 'vitest'
import type { FormularioCandidato } from './tipos'
import { mascaraTelefone, validarCandidato } from './validacao'

const VALIDO: FormularioCandidato = {
  nome: 'Maria Souza',
  email: 'maria.souza@exemplo.test',
  telefone: '',
  dataNascimento: '14/03/1988',
}
const HOJE = '2026-11-03'

describe('validarCandidato', () => {
  it('aceita um cadastro completo, com telefone em branco', () => {
    expect(validarCandidato(VALIDO, HOJE)).toEqual({})
  })

  it('aponta os obrigatórios', () => {
    const erros = validarCandidato({ nome: '', email: '', telefone: '', dataNascimento: '' }, HOJE)
    expect(Object.keys(erros).sort()).toEqual(['dataNascimento', 'email', 'nome'])
  })

  it('recusa e-mail sem domínio e telefone sem DDD', () => {
    const erros = validarCandidato({ ...VALIDO, email: 'maria@', telefone: '99999-000' }, HOJE)
    expect(erros.email).toBe('Informe um e-mail válido.')
    expect(erros.telefone).toBe('Informe o telefone com DDD, ex.: (83) 99999-0000.')
  })

  it('recusa data de nascimento inexistente ou no futuro', () => {
    expect(validarCandidato({ ...VALIDO, dataNascimento: '31/02/1990' }, HOJE).dataNascimento).toBe(
      'Data inválida. Use o formato dd/mm/aaaa.',
    )
    expect(validarCandidato({ ...VALIDO, dataNascimento: '04/11/2026' }, HOJE).dataNascimento).toBe(
      'A data de nascimento não pode ser no futuro.',
    )
  })
})

describe('mascaraTelefone', () => {
  it('formata celular e fixo enquanto a pessoa digita', () => {
    expect(mascaraTelefone('83999990000')).toBe('(83) 99999-0000')
    expect(mascaraTelefone('8332160000')).toBe('(83) 3216-0000')
    expect(mascaraTelefone('83')).toBe('(83')
  })
})
