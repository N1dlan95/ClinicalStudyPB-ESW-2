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

    await user.type(screen.getByLabelText('E-mail'), 'participante@clinicalstudypb.test');
    await user.type(screen.getByLabelText('Senha'), 'Senha@123');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(onSubmit).toHaveBeenCalledWith({ email: 'participante@clinicalstudypb.test', senha: 'Senha@123' });
  });

  it('exibe a mensagem de erro retornada pela autenticação', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new AuthError('E-mail ou senha incorretos.'));
    const user = userEvent.setup();
    await render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('E-mail'), 'participante@clinicalstudypb.test');
    await user.type(screen.getByLabelText('Senha'), 'errada');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.');
  });

  it('exibe a mensagem de usuário desativado vinda da API', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new AuthError('Usuário desativado. Procure o administrador'));
    const user = userEvent.setup();
    await render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('E-mail'), 'participante@clinicalstudypb.test');
    await user.type(screen.getByLabelText('Senha'), 'Senha@123');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário desativado. Procure o administrador');
  });

  it('erro inesperado mostra uma mensagem genérica', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('falha interna'));
    const user = userEvent.setup();
    await render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('E-mail'), 'participante@clinicalstudypb.test');
    await user.type(screen.getByLabelText('Senha'), 'Senha@123');
    await user.press(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível entrar. Tente novamente.');
  });
});
