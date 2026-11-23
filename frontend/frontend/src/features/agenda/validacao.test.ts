import { describe, expect, it } from 'vitest'
import type { Candidato } from '../candidatos/tipos'
import type { VisitaPrevista } from '../estudos/tipos'
import type { VisitaAgendada } from './tipos'
import {
  analisarJanelaAgendamento,
  atendeFiltroPeriodo,
  calcularJanelaVisita,
  validarAgendamentoVisita,
  validarExecucaoVisita,
} from './validacao'

const CANDIDATOS: Candidato[] = [
  {
    id: 10,
    nome: 'Maria Souza',
    email: 'maria@exemplo.test',
    telefone: '(83) 99999-1111',
    dataNascimento: '1990-05-10',
    status: 'INCLUIDO',
    dataInclusao: '2026-11-10',
  },
  {
    id: 11,
    nome: 'Carlos Elegível',
    email: 'carlos@exemplo.test',
    telefone: null,
    dataNascimento: '1988-02-20',
    status: 'ELEGIVEL',
    dataInclusao: null,
  },
]

const VISITAS_PREVISTAS: VisitaPrevista[] = [
  {
    id: 100,
    ordem: 1,
    nome: 'Visita de retorno D15',
    diaPrevisto: 15,
    janelaDias: 2,
    descricao: null,
    atividades: [],
  },
]

const VISITA_AGENDADA: VisitaAgendada = {
  id: 500,
  estudoId: 1,
  participante: {
    id: 10,
    nome: 'Maria Souza',
    email: 'maria@exemplo.test',
    status: 'INCLUIDO',
    dataInclusao: '2026-11-10',
  },
  visitaPrevista: {
    id: 100,
    ordem: 1,
    nome: 'Visita de retorno D15',
    diaPrevisto: 15,
    janelaDias: 2,
  },
  dataAgendada: '2026-11-25',
  horaAgendada: '09:00',
  dataSugerida: '2026-11-25',
  janelaInicio: '2026-11-23',
  janelaFim: '2026-11-27',
  foraDaJanela: false,
  local: 'Ambulatório Central · Sala 204',
  observacoes: null,
  status: 'AGENDADA',
  motivoCancelamento: null,
}

describe('validacao da agenda de visitas', () => {
  it('calcula data sugerida e janela de tolerância a partir da inclusão (D0)', () => {
    const resultado = calcularJanelaVisita('2026-11-10', { diaPrevisto: 15, janelaDias: 2 })
    expect(resultado).toEqual({
      dataInclusao: '2026-11-10',
      dataSugerida: '2026-11-25',
      janelaInicio: '2026-11-23',
      janelaFim: '2026-11-27',
      toleranciaDias: 2,
    })
  })

  it('detecta quando a data escolhida está dentro ou fora da janela prevista (R2-03)', () => {
    const dentro = analisarJanelaAgendamento('2026-11-26', '2026-11-10', {
      diaPrevisto: 15,
      janelaDias: 2,
    })
    expect(dentro?.foraDaJanela).toBe(false)
    expect(dentro?.diasDesvio).toBe(1)

    const fora = analisarJanelaAgendamento('2026-11-30', '2026-11-10', {
      diaPrevisto: 15,
      janelaDias: 2,
    })
    expect(fora?.foraDaJanela).toBe(true)
    expect(fora?.diasDesvio).toBe(5)
  })

  it('bloqueia data no passado, participante não incluído e visita já agendada (R2-05)', () => {
    const erros = validarAgendamentoVisita({
      participanteId: '11', // ELEGIVEL, não INCLUIDO
      visitaPrevistaId: '100',
      dataAgendada: '2026-11-15',
      horaAgendada: '09:00',
      candidatos: CANDIDATOS,
      visitasPrevistas: VISITAS_PREVISTAS,
      visitasAgendadas: [],
      dataHojeIso: '2026-11-20',
    })

    expect(erros.participanteId).toContain('Participante não incluído')
    expect(erros.dataAgendada).toContain('Data no passado')

    const erroDuplicada = validarAgendamentoVisita({
      participanteId: '10',
      visitaPrevistaId: '100',
      dataAgendada: '2026-11-25',
      horaAgendada: '09:00',
      candidatos: CANDIDATOS,
      visitasPrevistas: VISITAS_PREVISTAS,
      visitasAgendadas: [VISITA_AGENDADA],
      dataHojeIso: '2026-11-20',
    })

    expect(erroDuplicada.visitaPrevistaId).toContain('Visita já agendada')
  })

  it('exige motivo obrigatório ao cancelar visita agendada (R2-06)', () => {
    expect(validarExecucaoVisita('REALIZADA', '')).toEqual({})
    expect(validarExecucaoVisita('AUSENTE', '')).toEqual({})
    expect(validarExecucaoVisita('CANCELADA', '   ').motivoCancelamento).toContain(
      'Motivo obrigatório',
    )
    expect(validarExecucaoVisita('CANCELADA', 'abc').motivoCancelamento).toContain(
      'pelo menos 5 caracteres',
    )
    expect(
      validarExecucaoVisita('CANCELADA', 'Solicitação de reagendamento pelo participante'),
    ).toEqual({})
  })

  it('filtra visitas por período (Hoje, Próximos 7 dias, Este mês e Atrasadas)', () => {
    expect(atendeFiltroPeriodo(VISITA_AGENDADA, 'HOJE', '', '', '2026-11-25')).toBe(true)
    expect(atendeFiltroPeriodo(VISITA_AGENDADA, 'HOJE', '', '', '2026-11-20')).toBe(false)
    expect(atendeFiltroPeriodo(VISITA_AGENDADA, 'PROXIMOS_7_DIAS', '', '', '2026-11-20')).toBe(true)
    expect(atendeFiltroPeriodo(VISITA_AGENDADA, 'ESTE_MES', '', '', '2026-11-01')).toBe(true)
    expect(atendeFiltroPeriodo(VISITA_AGENDADA, 'ATRASADAS', '', '', '2026-11-28')).toBe(true)
  })
})
