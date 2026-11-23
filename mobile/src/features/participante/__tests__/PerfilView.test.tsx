import { render, screen, userEvent } from '@testing-library/react-native';
import { PerfilView } from '../PerfilView';
import { criarServico } from '../__fixtures__/participante';

const usuario = { id: 4, nome: 'Paula Participante', email: 'participante@clinicalstudypb.test', perfil: 'PARTICIPANTE' as const };

describe('<PerfilView />', () => {
  it('mostra os dados do participante', async () => {
    await render(<PerfilView servico={criarServico()} token="jwt" usuario={usuario} onSair={jest.fn()} />);

    expect(await screen.findByText('Paula Participante')).toBeOnTheScreen();
    expect(screen.getByText('participante@clinicalstudypb.test')).toBeOnTheScreen();
    expect(screen.getByText('PP')).toBeOnTheScreen();
  });

  it('não mostra o pedido de retirada nem busca os estudos (RF20 na Sprint 4)', async () => {
    const servico = criarServico();
    await render(<PerfilView servico={servico} token="jwt" usuario={usuario} onSair={jest.fn()} />);
    await screen.findByText('Paula Participante');

    expect(screen.queryByRole('button', { name: 'Solicitar retirada do estudo' })).not.toBeOnTheScreen();
    expect(screen.queryByText('Participação')).not.toBeOnTheScreen();
    expect(servico.listarEstudos).not.toHaveBeenCalled();
  });

  it('encerra a sessão ao tocar em Sair (RF02)', async () => {
    const onSair = jest.fn();
    const user = userEvent.setup();
    await render(<PerfilView servico={criarServico()} token="jwt" usuario={usuario} onSair={onSair} />);

    await user.press(await screen.findByRole('button', { name: 'Sair' }));
    expect(onSair).toHaveBeenCalled();
  });
});
