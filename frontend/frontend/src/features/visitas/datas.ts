// "2026-12-01T10:15:00" -> "01/12/2026 10:15"
export function dataHoraBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const [data, hora = ''] = iso.split('T')
  const [ano, mes, dia] = data.split('-')
  if (!ano || !mes || !dia) return iso
  const hhmm = hora.slice(0, 5)
  return hhmm ? `${dia}/${mes}/${ano} ${hhmm}` : `${dia}/${mes}/${ano}`
}
