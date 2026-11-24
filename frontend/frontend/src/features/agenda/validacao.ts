// Regras de cálculo de janela e validações de agendamento e execução de visitas (RF12 e RF13).
import type { Candidato } from '../candidatos/tipos'
import type { VisitaPrevista } from '../estudos/tipos'
import type {
  AcaoExecucaoVisita,
  ErrosAgendamentoVisita,
  PeriodoFiltroVisita,
  VisitaAgendada,
} from './tipos'

// Dia previsto e janela do protocolo (RF06), usados para calcular a data sugerida
export interface ProtocoloVisita {
  diaPrevisto: number
  janelaDias: number | null
}

export interface CalculoJanelaVisita {
  dataInclusao: string
  dataSugerida: string // ISO: aaaa-mm-dd
  janelaInicio: string // ISO: aaaa-mm-dd
  janelaFim: string // ISO: aaaa-mm-dd
  toleranciaDias: number
}

export interface AnaliseJanelaAgendamento extends CalculoJanelaVisita {
  foraDaJanela: boolean
  diasDesvio: number
}

// Soma dias a uma data ISO (aaaa-mm-dd) em UTC para evitar variações de fuso horário
export function somarDiasIso(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.slice(0, 10).split('-').map(Number)
  const data = new Date(Date.UTC(ano, mes - 1, dia + dias))
  return data.toISOString().slice(0, 10)
}

export function diferencaDiasIso(isoA: string, isoB: string): number {
  const [anoA, mesA, diaA] = isoA.slice(0, 10).split('-').map(Number)
  const [anoB, mesB, diaB] = isoB.slice(0, 10).split('-').map(Number)
  const msA = Date.UTC(anoA, mesA - 1, diaA)
  const msB = Date.UTC(anoB, mesB - 1, diaB)
  return Math.round((msA - msB) / (1000 * 60 * 60 * 24))
}

// Calcula a data sugerida (D0 + diaPrevisto) e a janela ideal (D0 + diaPrevisto ± janelaDias)
export function calcularJanelaVisita(
  dataInclusao: string | null | undefined,
  visitaPrevista: ProtocoloVisita | null | undefined,
  dataReferenciaEstudo?: string | null,
): CalculoJanelaVisita | null {
  const base = (dataInclusao || dataReferenciaEstudo || '').slice(0, 10)
  if (!base || !/^\d{4}-\d{2}-\d{2}$/.test(base) || !visitaPrevista) return null

  const tolerancia = Math.max(0, visitaPrevista.janelaDias ?? 0)
  const dataSugerida = somarDiasIso(base, visitaPrevista.diaPrevisto)
  const janelaInicio = somarDiasIso(base, Math.max(0, visitaPrevista.diaPrevisto - tolerancia))
  const janelaFim = somarDiasIso(base, visitaPrevista.diaPrevisto + tolerancia)

  return {
    dataInclusao: base,
    dataSugerida,
    janelaInicio,
    janelaFim,
    toleranciaDias: tolerancia,
  }
}

// Verifica se a data escolhida no formulário está dentro ou fora da janela prevista do protocolo (R2-03)
export function analisarJanelaAgendamento(
  dataAgendada: string,
  dataInclusao: string | null | undefined,
  visitaPrevista: ProtocoloVisita | null | undefined,
  dataReferenciaEstudo?: string | null,
): AnaliseJanelaAgendamento | null {
  const calculo = calcularJanelaVisita(dataInclusao, visitaPrevista, dataReferenciaEstudo)
  const dataIso = dataAgendada.trim().slice(0, 10)
  if (!calculo || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return null

  const foraDaJanela = dataIso < calculo.janelaInicio || dataIso > calculo.janelaFim
  const diasDesvio = Math.abs(diferencaDiasIso(dataIso, calculo.dataSugerida))

  return {
    ...calculo,
    foraDaJanela,
    diasDesvio,
  }
}

export interface ContextoValidacaoAgendamento {
  participanteId: string
  visitaPrevistaId: string
  dataAgendada: string
  horaAgendada: string
  candidatos: Candidato[]
  visitasPrevistas: VisitaPrevista[]
  visitasAgendadas: VisitaAgendada[]
  dataHojeIso?: string
}

// Valida os campos obrigatórios e as 3 regras de bloqueio do formulário de agendamento (R2-05):
// 1. Data no passado
// 2. Participante não incluído (status !== 'INCLUIDO')
// 3. Visita já agendada para o mesmo participante
export function validarAgendamentoVisita(
  contexto: ContextoValidacaoAgendamento,
): ErrosAgendamentoVisita {
  const erros: ErrosAgendamentoVisita = {}
  const hoje = (contexto.dataHojeIso ?? new Date().toISOString().slice(0, 10)).slice(0, 10)

  if (!contexto.participanteId.trim()) {
    erros.participanteId = 'Selecione o participante do estudo.'
  } else {
    const idParticipante = Number(contexto.participanteId)
    const candidato = contexto.candidatos.find((c) => c.id === idParticipante)
    if (!candidato) {
      erros.participanteId = 'Participante não encontrado neste estudo.'
    } else if (candidato.status !== 'INCLUIDO') {
      erros.participanteId =
        'Participante não incluído: apenas participantes com status Incluído podem ter visitas agendadas.'
    }
  }

  if (!contexto.visitaPrevistaId.trim()) {
    erros.visitaPrevistaId = 'Selecione a visita prevista do protocolo.'
  } else if (contexto.participanteId.trim()) {
    const idParticipante = Number(contexto.participanteId)
    const idVisitaPrevista = Number(contexto.visitaPrevistaId)
    const jaExiste = contexto.visitasAgendadas.some(
      (v) =>
        v.participante.id === idParticipante &&
        v.visitaPrevista.id === idVisitaPrevista &&
        (v.status === 'AGENDADA' || v.status === 'REALIZADA'),
    )
    if (jaExiste) {
      erros.visitaPrevistaId =
        'Visita já agendada: este participante já possui um agendamento ativo ou concluído para esta visita prevista.'
    }
  }

  const dataLimpa = contexto.dataAgendada.trim()
  if (!dataLimpa) {
    erros.dataAgendada = 'Informe a data da visita.'
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dataLimpa)) {
    erros.dataAgendada = 'Informe uma data válida.'
  } else if (dataLimpa < hoje) {
    erros.dataAgendada = 'Data no passado: a data do agendamento não pode ser anterior a hoje.'
  }

  const horaLimpa = contexto.horaAgendada.trim()
  if (!horaLimpa) {
    erros.horaAgendada = 'Informe o horário da visita.'
  } else if (!/^\d{2}:\d{2}$/.test(horaLimpa)) {
    erros.horaAgendada = 'Informe um horário válido no formato HH:MM.'
  }

  return erros
}

// Valida o registro de realização, ausência ou cancelamento da visita (R2-04 e R2-06)
export function validarExecucaoVisita(
  acao: AcaoExecucaoVisita,
  motivoCancelamento: string,
): { motivoCancelamento?: string } {
  if (acao === 'CANCELADA') {
    const motivoLimpo = motivoCancelamento.trim()
    if (!motivoLimpo) {
      return {
        motivoCancelamento:
          'Motivo obrigatório: informe o motivo do cancelamento da visita.',
      }
    }
    if (motivoLimpo.length < 5) {
      return {
        motivoCancelamento:
          'O motivo do cancelamento deve ter pelo menos 5 caracteres.',
      }
    }
  }
  return {}
}

// Filtra uma visita pelo período selecionado na agenda (R2-01)
export function atendeFiltroPeriodo(
  visita: VisitaAgendada,
  periodo: PeriodoFiltroVisita,
  dataInicioFiltro: string,
  dataFimFiltro: string,
  hojeIso = new Date().toISOString().slice(0, 10),
): boolean {
  const data = visita.dataAgendada.slice(0, 10)
  if (dataInicioFiltro && data < dataInicioFiltro) return false
  if (dataFimFiltro && data > dataFimFiltro) return false

  switch (periodo) {
    case 'HOJE':
      return data === hojeIso
    case 'PROXIMOS_7_DIAS': {
      const limite = somarDiasIso(hojeIso, 7)
      return data >= hojeIso && data <= limite
    }
    case 'ESTE_MES':
      return data.slice(0, 7) === hojeIso.slice(0, 7)
    case 'ATRASADAS':
      return visita.status === 'AGENDADA' && data < hojeIso
    case 'TODOS':
    default:
      return true
  }
}
