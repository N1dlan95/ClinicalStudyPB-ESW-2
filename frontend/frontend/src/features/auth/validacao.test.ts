import { describe, expect, it } from 'vitest'
import { validarLogin } from './validacao'

describe('validarLogin', () => {
  it('não retorna erros quando e-mail e senha estão corretos', () => {
    expect(validarLogin('pesquisadora@clinicalstudy.pb', 'segredo')).toEqual({})
  })

  it('exige o e-mail', () => {
    expect(validarLogin('', 'segredo').email).toBe('Informe o e-mail.')
  })

  it('considera vazio um e-mail só com espaços', () => {
    expect(validarLogin('   ', 'segredo').email).toBe('Informe o e-mail.')
  })

  it.each(['pesquisadora', 'pesquisadora@', 'pesquisadora@clinicalstudy', 'pesq uisadora@clinicalstudy.pb'])(
    'recusa o e-mail inválido "%s"',
    (email) => {
      expect(validarLogin(email, 'segredo').email).toBe('Informe um e-mail válido.')
    },
  )

  it('aceita e-mail com espaços antes ou depois', () => {
    expect(validarLogin('  pesquisadora@clinicalstudy.pb  ', 'segredo').email).toBeUndefined()
  })

  it('exige a senha', () => {
    expect(validarLogin('pesquisadora@clinicalstudy.pb', '').senha).toBe('Informe a senha.')
  })

  it('retorna os dois erros quando tudo está vazio', () => {
    expect(validarLogin('', '')).toEqual({
      email: 'Informe o e-mail.',
      senha: 'Informe a senha.',
    })
  })
})
