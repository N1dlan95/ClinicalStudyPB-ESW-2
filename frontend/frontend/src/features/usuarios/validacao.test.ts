import { describe, expect, it } from 'vitest'
import type { FormularioUsuario } from './tipos'
import { validarUsuario } from './validacao'

const VALIDO: FormularioUsuario = {
  nome: 'Ana Souza',
  email: 'ana@clinicalstudy.pb',
  perfil: 'PESQUISADOR',
  ativo: true,
  enviarConvite: true,
}

describe('validarUsuario', () => {
  it('não retorna erros quando o formulário está correto', () => {
    expect(validarUsuario(VALIDO)).toEqual({})
  })

  it('retorna os três erros quando tudo está vazio', () => {
    expect(validarUsuario({ ...VALIDO, nome: '', email: '', perfil: '' })).toEqual({
      nome: 'Informe o nome completo.',
      email: 'Informe o e-mail.',
      perfil: 'Selecione o perfil de acesso.',
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

  it('não valida status nem convite (são opcionais)', () => {
    expect(validarUsuario({ ...VALIDO, ativo: false, enviarConvite: false })).toEqual({})
  })
})
