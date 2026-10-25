import { render, screen, userEvent } from '@testing-library/react-native';
import { EstudosView } from '../EstudosView';
import { criarServicoMock } from '../participanteService';

describe('<EstudosView />', () => {
  it('lista os estudos do participante com status e próxima visita (RF17)', async () => {
    const onVerVisitas = jest.fn();
    const user = userEvent.setup();
    await render(
      <EstudosView servico={criarServicoMock(0)} token="t" nomeUsuario="Participante Demo" onVerVisitas={onVerVisitas} />,
    );

    expect(await screen.findByText('Estudo de exemplo A')).toBeOnTheScreen();
    expect(screen.getByText('Olá, Participante Demo')).toBeOnTheScreen();
    expect(screen.getByText('Em execução')).toBeOnTheScreen();
    expect(screen.getByText('Encerrado')).toBeOnTheScreen();
    expect(screen.getByText('28/10/2026 · 09:00 · Visita 2')).toBeOnTheScreen();

    await user.press(screen.getByText('Ver visitas'));
    expect(onVerVisitas).toHaveBeenCalled();
  });
});
