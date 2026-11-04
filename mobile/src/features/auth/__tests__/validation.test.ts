import { temErros, validarCredenciais } from '../validation';

describe('validarCredenciais', () => {
  it('exige e-mail e senha', () => {
    expect(validarCredenciais({ email: '', senha: '' })).toEqual({
      email: 'Informe o e-mail.',
      senha: 'Informe a senha.',
    });
  });

  it('rejeita e-mail em formato inválido', () => {
    expect(validarCredenciais({ email: 'joao@', senha: 'x' }).email).toBe('E-mail inválido.');
  });

  it('aceita credenciais preenchidas corretamente', () => {
    const erros = validarCredenciais({ email: ' ana@teste.com ', senha: '123' });
    expect(temErros(erros)).toBe(false);
  });
});
