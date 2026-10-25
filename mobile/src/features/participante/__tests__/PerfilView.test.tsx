import { render, screen, userEvent } from '@testing-library/react-native';
import { criarServicoMock } from '../participanteService';
import { PerfilView } from '../PerfilView';

const usuario = { id: 1, nome: 'Participante Demo', email: 'participante@clinicalstudy.pb', perfil: 'PARTICIPANTE' as const };

describe('<PerfilView />', () => {
  it('pede confirmação antes de solicitar a retirada (RF20)', async () => {
    const servico = criarServicoMock(0);
    const spy = jest.spyOn(servico, 'solicitarRetirada');
    const user = userEvent.setup();
    await render(<PerfilView servico={servico} token="t" usuario={usuario} onSair={jest.fn()} />);

    await user.press(await screen.findByRole('button', { name: 'Solicitar retirada do estudo' }));
    expect(screen.getByText(/Confirma a solicitação de retirada/)).toBeOnTheScreen();
    expect(spy).not.toHaveBeenCalled();

    await user.press(screen.getByRole('button', { name: 'Confirmar retirada' }));
    expect(await screen.findByText('Solicitação de retirada enviada à coordenação.')).toBeOnTheScreen();
    expect(spy).toHaveBeenCalledWith('t', 1);
  });

  it('cancelar não envia a retirada', async () => {
    const servico = criarServicoMock(0);
    const spy = jest.spyOn(servico, 'solicitarRetirada');
    const user = userEvent.setup();
    await render(<PerfilView servico={servico} token="t" usuario={usuario} onSair={jest.fn()} />);

    await user.press(await screen.findByRole('button', { name: 'Solicitar retirada do estudo' }));
    await user.press(screen.getByRole('button', { name: 'Cancelar' }));

    expect(screen.getByRole('button', { name: 'Solicitar retirada do estudo' })).toBeOnTheScreen();
    expect(spy).not.toHaveBeenCalled();
  });

  it('encerra a sessão ao tocar em Sair (RF02)', async () => {
    const onSair = jest.fn();
    const user = userEvent.setup();
    await render(<PerfilView servico={criarServicoMock(0)} token="t" usuario={usuario} onSair={onSair} />);

    await user.press(await screen.findByRole('button', { name: 'Sair' }));
    expect(onSair).toHaveBeenCalled();
  });
});
