import { isoParaBR } from '../estudos/datas'

// "2026-10-22T08:42" -> "22/10/2026 · 08:42" (separador muda conforme a tela)
export function dataHoraParaBR(iso: string, separador = ' · '): string {
  const [data, hora = ''] = iso.split('T')
  return hora ? `${isoParaBR(data)}${separador}${hora.slice(0, 5)}` : isoParaBR(data)
}

// "Pesquisadora Demo" -> "PD"
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/)
  const primeira = partes[0]?.[0] ?? ''
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : ''
  return (primeira + ultima).toUpperCase()
}
