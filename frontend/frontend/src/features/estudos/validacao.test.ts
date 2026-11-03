import { describe, expect, it } from 'vitest'
import type { FormularioEstudo } from './tipos'
import { validarEstudo } from './validacao'

const VALIDO: FormularioEstudo = {
  titulo: 'Estudo de exemplo A',
  objetivo: 'Avaliar a adesão ao tratamento',
  responsavelId: '2',
  dataInicio: '10/11/2026',
  dataFim: '',
  limiteParticipantes: '30',
}

describe('validarEstudo', () => {
  it('aceita um formulário completo, com data de término opcional em branco', () => {
    expect(validarEstudo(VALIDO)).toEqual({})
  })

  it('aponta os campos obrigatórios do contrato', () => {
    const erros = validarEstudo({
      titulo: '',
      objetivo: '',
      responsavelId: '',
      dataInicio: '',
      dataFim: '',
      limiteParticipantes: '',
    })
    expect(Object.keys(erros).sort()).toEqual(
      ['dataInicio', 'limiteParticipantes', 'objetivo', 'responsavelId', 'titulo'].sort(),
    )
  })

  it('exige título entre 3 e 200 caracteres', () => {
    expect(validarEstudo({ ...VALIDO, titulo: 'AB' }).titulo).toBe(
      'O título deve ter entre 3 e 200 caracteres.',
    )
  })

  it('não aceita término antes do início, mas aceita a mesma data', () => {
    expect(validarEstudo({ ...VALIDO, dataFim: '09/11/2026' }).dataFim).toBe(
      'A data de término não pode ser anterior à data de início.',
    )
    expect(validarEstudo({ ...VALIDO, dataFim: '10/11/2026' }).dataFim).toBeUndefined()
  })

  it('recusa data inexistente e limite zero', () => {
    const erros = validarEstudo({ ...VALIDO, dataInicio: '31/02/2027', limiteParticipantes: '0' })
    expect(erros.dataInicio).toBe('Data inválida. Use o formato dd/mm/aaaa.')
    expect(erros.limiteParticipantes).toBe('Informe um número inteiro maior que zero.')
  })
})
