import { describe, expect, it } from 'vitest'
import type { FormularioUsuario } from './tipos'
import { validarUsuario } from './validacao'

const VALIDO: FormularioUsuario = {
  nome: 'Ana Souza',
  email: 'ana@clinicalstudy.pb',
  perfil: 'PESQUISADOR',
  ativo: true,
  senha: 'Senha@123',
}

describe('validarUsuario', () => {
  it('não retorna erros quando o formulário está correto', () => {
    expect(validarUsuario(VALIDO)).toEqual({})
  })

  it('retorna os quatro erros quando tudo está vazio no cadastro', () => {
    expect(validarUsuario({ ...VALIDO, nome: '', email: '', perfil: '', senha: '' })).toEqual({
      nome: 'Informe o nome completo.',
      email: 'Informe o e-mail.',
      perfil: 'Selecione o perfil de acesso.',
      senha: 'Informe a senha.',
    })
  })

  it('considera vazio um nome só com espaços', () => {
    expect(validarUsuario({ ...VALIDO, nome: '   ' }).nome).toBe('Informe o nome completo.')
  })

  it('exige nome e sobrenome', () => {
    expect(validarUsuario({ ...VALIDO, nome: 'Ana' }).nome).toBe('Informe nome e sobrenome.')
  })

  it('aceita nome com espaços sobrando', () => {
    expect(validarUsuario({ ...VALIDO, nome: '  Ana   Souza  ' }).nome).toBeUndefined()
  })

  it.each(['ana', 'ana@', 'ana@clinicalstudy', 'an a@clinicalstudy.pb'])(
    'recusa o e-mail inválido "%s"',
    (email) => {
      expect(validarUsuario({ ...VALIDO, email }).email).toBe('Informe um e-mail válido.')
    },
  )

  it('exige um perfil de acesso', () => {
    expect(validarUsuario({ ...VALIDO, perfil: '' }).perfil).toBe('Selecione o perfil de acesso.')
  })

  it('exige senha com pelo menos 8 caracteres', () => {
    expect(validarUsuario({ ...VALIDO, senha: '1234567' }).senha).toBe(
      'A senha deve ter pelo menos 8 caracteres.',
    )
    expect(validarUsuario({ ...VALIDO, senha: '12345678' }).senha).toBeUndefined()
  })

  it('recusa senha com mais de 72 caracteres (limite da API)', () => {
    expect(validarUsuario({ ...VALIDO, senha: 'a'.repeat(73) }).senha).toBe(
      'A senha deve ter no máximo 72 caracteres.',
    )
  })

  it('não exige senha na edição', () => {
    expect(validarUsuario({ ...VALIDO, senha: '' }, true)).toEqual({})
  })

  it('não valida o status (é opcional)', () => {
    expect(validarUsuario({ ...VALIDO, ativo: false })).toEqual({})
  })
})
