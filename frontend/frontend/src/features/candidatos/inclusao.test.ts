import { describe, expect, it } from 'vitest'
import type { Estudo } from '../estudos/tipos'
import { ErroCandidatoApi } from './candidatosService'
import { bloqueioDoErro, bloqueioInclusao, mensagemErroInclusao } from './inclusao'
import type { Candidato } from './tipos'

const ESTUDO: Estudo = {
  id: 7,
  titulo: 'Estudo',
  objetivo: 'Objetivo',
  responsavel: { id: 2, nome: 'Ana Pesquisadora' },
  dataInicio: '2026-11-10',
  dataFim: null,
  limiteParticipantes: 2,
  estado: 'RECRUTAMENTO',
}

const PRONTO: Candidato = {
  id: 1,
  nome: 'Ana Ribeiro',
  email: 'ana@exemplo.test',
  telefone: null,
  dataNascimento: '1995-05-22',
  status: 'ELEGIVEL',
  consentimento: { registradoEm: '2026-11-03', registradoPor: null },
}

describe('bloqueioInclusao', () => {
  it('libera quando tudo está certo e há vaga', () => {
    expect(bloqueioInclusao(PRONTO, ESTUDO, 1)).toBeNull()
  })

  it('segue a ordem do backend: estado, elegibilidade, consentimento e vaga', () => {
    const tudoErrado = { ...PRONTO, status: 'CADASTRADO' as const, consentimento: null }
    expect(bloqueioInclusao(tudoErrado, { ...ESTUDO, estado: 'PLANEJAMENTO' }, 2)).toBe('FORA_DE_RECRUTAMENTO')
    expect(bloqueioInclusao(tudoErrado, ESTUDO, 2)).toBe('NAO_ELEGIVEL')
    expect(bloqueioInclusao({ ...PRONTO, consentimento: null }, ESTUDO, 2)).toBe('SEM_CONSENTIMENTO')
    expect(bloqueioInclusao(PRONTO, ESTUDO, 2)).toBe('VAGAS_ESGOTADAS')
  })

  it('não bloqueia por vagas enquanto o contador não carregou', () => {
    expect(bloqueioInclusao(PRONTO, ESTUDO, null)).toBeNull()
  })
})

describe('mensagens de erro da inclusão', () => {
  it('reconhece variações dos códigos da API', () => {
    const erro = (codigo: string) => new ErroCandidatoApi('x', 409, codigo, {})
    expect(bloqueioDoErro(erro('ESTUDO_FORA_DE_RECRUTAMENTO'))).toBe('FORA_DE_RECRUTAMENTO')
    expect(bloqueioDoErro(erro('CANDIDATO_NAO_ELEGIVEL'))).toBe('NAO_ELEGIVEL')
    expect(bloqueioDoErro(erro('SEM_CONSENTIMENTO'))).toBe('SEM_CONSENTIMENTO')
    expect(bloqueioDoErro(erro('LIMITE_PARTICIPANTES_ATINGIDO'))).toBe('VAGAS_ESGOTADAS')
    expect(bloqueioDoErro(erro('OUTRA_REGRA'))).toBeNull()
  })

  it('usa o texto da API quando ele existe e o nosso quando a API manda só o genérico', () => {
    expect(mensagemErroInclusao(new ErroCandidatoApi('Sem vagas: 40 de 40', 409, 'SEM_VAGAS', {}))).toEqual({
      titulo: 'Vagas esgotadas',
      texto: 'Sem vagas: 40 de 40',
    })
    expect(
      mensagemErroInclusao(new ErroCandidatoApi('A operação conflita com uma regra do estudo.', 409, 'SEM_VAGAS', {})).texto,
    ).toBe('Todas as vagas do estudo estão ocupadas. Para incluir, aumente o limite na edição do estudo.')
    expect(mensagemErroInclusao(new ErroCandidatoApi('Falha', 500, null, {}))).toEqual({
      titulo: 'Não foi possível incluir o candidato',
      texto: 'Falha',
    })
  })
})
