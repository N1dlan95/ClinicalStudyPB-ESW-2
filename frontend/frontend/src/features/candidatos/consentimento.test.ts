import { describe, expect, it } from 'vitest'
import { dataConsentimento, podeRegistrarConsentimento } from './consentimento'
import type { Candidato } from './tipos'

const BASE: Candidato = {
  id: 1,
  nome: 'Ana Ribeiro',
  email: 'ana@exemplo.test',
  telefone: null,
  dataNascimento: '1995-05-22',
  status: 'ELEGIVEL',
}

describe('podeRegistrarConsentimento', () => {
  it('só libera para candidato elegível e sem consentimento', () => {
    expect(podeRegistrarConsentimento(BASE)).toBe(true)
    expect(podeRegistrarConsentimento({ ...BASE, consentimento: null })).toBe(true)
    expect(podeRegistrarConsentimento({ ...BASE, consentimento: { registradoEm: '2026-11-04', registradoPor: null } })).toBe(false)
    for (const status of ['CADASTRADO', 'INELEGIVEL', 'INCLUIDO', 'RETIRADO'] as const) {
      expect(podeRegistrarConsentimento({ ...BASE, status })).toBe(false)
    }
  })
})

describe('dataConsentimento', () => {
  it('mostra só a data, mesmo quando a API manda data e hora', () => {
    expect(dataConsentimento('2026-11-04T10:00:00-03:00')).toBe('04/11/2026')
    expect(dataConsentimento('2026-11-04')).toBe('04/11/2026')
    // formato do LocalDateTime do backend (CandidatoResponse.Consentimento)
    expect(dataConsentimento('2026-11-06T21:27:14.123456')).toBe('06/11/2026')
  })
})
