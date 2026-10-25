import { brParaIso } from './datas'
import type { CampoEstudo, ErrosEstudo, FormularioEstudo } from './tipos'

// Nomes exibidos na lista do aviso "Corrija N campos..."
export const ROTULO_CAMPO: Record<CampoEstudo, string> = {
  titulo: 'Título do estudo',
  codigoProtocolo: 'Código do protocolo',
  descricao: 'Descrição',
  pesquisadorId: 'Pesquisador responsável',
  status: 'Status',
  dataInicio: 'Data de início',
  dataTermino: 'Data de término prevista',
  limiteParticipantes: 'Limite de participantes',
}

// Ordem em que os campos aparecem na tela (e no aviso)
export const ORDEM_CAMPOS: CampoEstudo[] = [
  'titulo',
  'codigoProtocolo',
  'pesquisadorId',
  'status',
  'dataInicio',
  'dataTermino',
  'limiteParticipantes',
]

export function validarEstudo(
  form: FormularioEstudo,
  participantesIncluidos: number,
): ErrosEstudo {
  const erros: ErrosEstudo = {}

  if (!form.titulo.trim()) erros.titulo = 'Informe o título do estudo.'
  if (!form.codigoProtocolo.trim()) erros.codigoProtocolo = 'Informe o código do protocolo.'
  if (!form.pesquisadorId) erros.pesquisadorId = 'Selecione o pesquisador responsável.'

  const inicio = form.dataInicio.trim() ? brParaIso(form.dataInicio) : null
  const termino = form.dataTermino.trim() ? brParaIso(form.dataTermino) : null

  if (!form.dataInicio.trim()) erros.dataInicio = 'Informe a data de início.'
  else if (!inicio) erros.dataInicio = 'Data inválida. Use o formato dd/mm/aaaa.'

  if (!form.dataTermino.trim()) erros.dataTermino = 'Informe a data de término prevista.'
  else if (!termino) erros.dataTermino = 'Data inválida. Use o formato dd/mm/aaaa.'
  else if (inicio && termino <= inicio) {
    erros.dataTermino = 'A data de término deve ser depois da data de início.'
  }

  const textoLimite = form.limiteParticipantes.trim()
  const limite = Number(textoLimite)
  if (!textoLimite) {
    erros.limiteParticipantes = 'Informe o limite de participantes.'
  } else if (!Number.isInteger(limite) || limite <= 0) {
    erros.limiteParticipantes = 'Informe um número inteiro maior que zero.'
  } else if (limite < participantesIncluidos) {
    erros.limiteParticipantes = `O limite não pode ser menor que o número de participantes já incluídos (${participantesIncluidos}).`
  }

  return erros
}
