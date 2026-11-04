import type { Candidato } from './tipos'

// Regra da task 3564: a ação aparece só para candidato elegível sem consentimento
export function podeRegistrarConsentimento(c: Candidato): boolean {
  return c.status === 'ELEGIVEL' && !c.consentimento
}

// "2026-11-03T14:20:00-03:00" ou "2026-11-03" -> "03/11/2026"
export function dataConsentimento(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso
}
