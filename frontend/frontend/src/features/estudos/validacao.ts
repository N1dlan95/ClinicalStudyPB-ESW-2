import { brParaIso } from './datas'
import type { CampoEstudo, ErrosEstudo, FormularioEstudo } from './tipos'

// Regras iguais às do backend (EstudoRequest e EstudoService) e do openapi.yaml (EstudoEntrada)
export const TITULO_MIN = 3
export const TITULO_MAX = 200
export const OBJETIVO_MAX = 2000

// Nomes exibidos na lista do aviso "Corrija N campos..."
export const ROTULO_CAMPO: Record<CampoEstudo, string> = {
  titulo: 'Título do estudo',
  objetivo: 'Objetivo',
  responsavelId: 'Pesquisador responsável',
  dataInicio: 'Data de início',
  dataFim: 'Data de término prevista',
  limiteParticipantes: 'Limite de participantes',
}

// Ordem em que os campos aparecem na tela (e no aviso)
export const ORDEM_CAMPOS: CampoEstudo[] = [
  'titulo',
  'objetivo',
  'responsavelId',
  'dataInicio',
  'dataFim',
  'limiteParticipantes',
]

export function validarEstudo(form: FormularioEstudo): ErrosEstudo {
  const erros: ErrosEstudo = {}

  const titulo = form.titulo.trim()
  if (!titulo) erros.titulo = 'Informe o título do estudo.'
  else if (titulo.length < TITULO_MIN || titulo.length > TITULO_MAX) {
    erros.titulo = `O título deve ter entre ${TITULO_MIN} e ${TITULO_MAX} caracteres.`
  }

  const objetivo = form.objetivo.trim()
  if (!objetivo) erros.objetivo = 'Informe o objetivo do estudo.'
  else if (objetivo.length > OBJETIVO_MAX) {
    erros.objetivo = `O objetivo deve ter no máximo ${OBJETIVO_MAX} caracteres.`
  }

  if (!form.responsavelId) erros.responsavelId = 'Selecione o pesquisador responsável.'

  const inicio = form.dataInicio.trim() ? brParaIso(form.dataInicio) : null
  if (!form.dataInicio.trim()) erros.dataInicio = 'Informe a data de início.'
  else if (!inicio) erros.dataInicio = 'Data inválida. Use o formato dd/mm/aaaa.'

  // A data de término é opcional; se vier, não pode ser anterior à de início
  if (form.dataFim.trim()) {
    const fim = brParaIso(form.dataFim)
    if (!fim) erros.dataFim = 'Data inválida. Use o formato dd/mm/aaaa.'
    else if (inicio && fim < inicio) {
      erros.dataFim = 'A data de término não pode ser anterior à data de início.'
    }
  }

  const textoLimite = form.limiteParticipantes.trim()
  const limite = Number(textoLimite)
  if (!textoLimite) erros.limiteParticipantes = 'Informe o limite de participantes.'
  else if (!Number.isInteger(limite) || limite <= 0) {
    erros.limiteParticipantes = 'Informe um número inteiro maior que zero.'
  }

  return erros
}
