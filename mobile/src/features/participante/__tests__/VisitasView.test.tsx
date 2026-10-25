import { render, screen, userEvent } from '@testing-library/react-native';
import { criarServicoMock } from '../participanteService';
import { VisitasView } from '../VisitasView';

describe('<VisitasView />', () => {
  it('lista as próximas visitas e mostra o histórico ao trocar de aba (RF18)', async () => {
    const user = userEvent.setup();
    await render(<VisitasView servico={criarServicoMock(0)} token="t" />);

    expect(await screen.findByText('Visita 2 · Acompanhamento')).toBeOnTheScreen();
    expect(screen.queryByText('Visita 1 · Inclusão')).not.toBeOnTheScreen();

    await user.press(screen.getByRole('tab', { name: 'Histórico' }));

    expect(await screen.findByText('Visita 1 · Inclusão')).toBeOnTheScreen();
    expect(screen.getByText('Realizada')).toBeOnTheScreen();
    expect(screen.getByText('Ausente')).toBeOnTheScreen();
  });

  it('confirma a presença prevista (RF19)', async () => {
    const user = userEvent.setup();
    await render(<VisitasView servico={criarServicoMock(0)} token="t" />);
    await screen.findByText('Visita 2 · Acompanhamento');

    await user.press(screen.getAllByRole('button', { name: 'Confirmar presença' })[0]);

    expect(await screen.findByText('Presença confirmada')).toBeOnTheScreen();
  });

  it('solicita reagendamento (RF19)', async () => {
    const user = userEvent.setup();
    await render(<VisitasView servico={criarServicoMock(0)} token="t" />);
    await screen.findByText('Visita 2 · Acompanhamento');

    await user.press(screen.getAllByRole('button', { name: 'Solicitar reagendamento' })[0]);

    expect(await screen.findByText(/Reagendamento solicitado/)).toBeOnTheScreen();
  });

  it('mostra erro e permite tentar novamente quando o carregamento falha', async () => {
    const servico = criarServicoMock(0);
    servico.listarVisitas = jest.fn().mockRejectedValueOnce(new Error('Falha de rede.')).mockResolvedValue([]);
    const user = userEvent.setup();
    await render(<VisitasView servico={servico} token="t" />);

    expect(await screen.findByText('Falha de rede.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma visita agendada.')).toBeOnTheScreen();
  });
});
