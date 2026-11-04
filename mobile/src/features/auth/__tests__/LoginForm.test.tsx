import { render, screen, userEvent } from '@testing-library/react-native';
import { AuthError } from '../authService';
import { LoginForm } from '../LoginForm';

describe('<LoginForm />', () => {
  it('mostra erros de validação e não envia com campos vazios', async () => {
    const onSubmit = jest.fn();
    const user = userEvent.setup();
    await render(<LoginForm onSubmit={onSubmit} />);

    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(screen.getByText('Informe o e-mail.')).toBeOnTheScreen();
    expect(screen.getByText('Informe a senha.')).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envia e-mail e senha digitados', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    await render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('E-mail'), 'participante@clinicalstudy.pb');
    await user.type(screen.getByLabelText('Senha'), 'senha123');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'participante@clinicalstudy.pb', senha: 'senha123' });
  });

  it('exibe a mensagem de erro retornada pela autenticação', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new AuthError('E-mail ou senha incorretos.'));
    const user = userEvent.setup();
    await render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('E-mail'), 'participante@clinicalstudy.pb');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });
});
