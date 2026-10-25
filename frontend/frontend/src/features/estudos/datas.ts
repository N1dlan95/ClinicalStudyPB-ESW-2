// "2026-10-15" -> "15/10/2026"
export function isoParaBR(iso: string | null | undefined): string {
  if (!iso) return ''
  const [ano, mes, dia] = iso.slice(0, 10).split('-')
  if (!ano || !mes || !dia) return ''
  return `${dia}/${mes}/${ano}`
}

// "15/10/2026" -> "2026-10-15". Devolve null se não for uma data real (ex.: 31/02/2027).
export function brParaIso(texto: string): string | null {
  const partes = texto.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!partes) return null
  const dia = Number(partes[1])
  const mes = Number(partes[2])
  const ano = Number(partes[3])
  const data = new Date(ano, mes - 1, dia)
  const valida =
    data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia
  if (!valida) return null
  return `${partes[3]}-${partes[2]}-${partes[1]}`
}

// Vai colocando as barras enquanto a pessoa digita: 15102026 -> 15/10/2026
export function mascaraData(valor: string): string {
  const numeros = valor.replace(/\D/g, '').slice(0, 8)
  if (numeros.length <= 2) return numeros
  if (numeros.length <= 4) return `${numeros.slice(0, 2)}/${numeros.slice(2)}`
  return `${numeros.slice(0, 2)}/${numeros.slice(2, 4)}/${numeros.slice(4)}`
}
