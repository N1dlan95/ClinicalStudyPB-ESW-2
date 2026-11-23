import { render, screen, userEvent, within } from '@testing-library/react-native';
import { VisitasView } from '../VisitasView';
import { criarServico, visitas } from '../__fixtures__/participante';

describe('<VisitasView />', () => {
  it('separa as próximas visitas do histórico de comparecimento (RF18)', async () => {
    await render(<VisitasView servico={criarServico()} token="jwt" />);

    expect(await screen.findByText('Próximas visitas')).toBeOnTheScreen();
    expect(screen.getByText('Histórico de comparecimento')).toBeOnTheScreen();

    // Próximas em ordem crescente; histórico da mais recente para a mais antiga
    const nomes = screen.getAllByText(/^(Visita inicial|Retorno de 7 dias|Retorno de 30 dias|Visita final)$/)
      .map((elemento) => elemento.props.children);
    expect(nomes).toEqual(['Retorno de 30 dias', 'Visita final', 'Retorno de 7 dias', 'Visita inicial']);

    expect(screen.getAllByText('Agendada')).toHaveLength(2);
    expect(screen.getByText('Realizada')).toBeOnTheScreen();
    expect(screen.getByText('Ausente')).toBeOnTheScreen();
    expect(screen.getByText('30/12/2026 · 09:00')).toBeOnTheScreen();
    expect(screen.getAllByText('Estudo de Controle Glicêmico')).toHaveLength(4);
  });

  it('não mostra as ações de confirmar presença nem de reagendar (RF19 na Sprint 4)', async () => {
    await render(<VisitasView servico={criarServico()} token="jwt" />);
    await screen.findByText('Próximas visitas');

    expect(screen.queryByRole('button', { name: 'Confirmar presença' })).not.toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Solicitar reagendamento' })).not.toBeOnTheScreen();
  });

  it('mostra o vazio de cada seção', async () => {
    const servico = criarServico({ listarVisitas: jest.fn().mockResolvedValue([]) });
    await render(<VisitasView servico={servico} token="jwt" />);

    expect(await screen.findByText('Nenhuma visita agendada.')).toBeOnTheScreen();
    expect(screen.getByText('Nenhuma visita no histórico.')).toBeOnTheScreen();
  });

  it('com só histórico, a seção de próximas fica vazia', async () => {
    const servico = criarServico({
      listarVisitas: jest.fn().mockResolvedValue(visitas.filter((v) => v.status !== 'AGENDADA')),
    });
    await render(<VisitasView servico={servico} token="jwt" />);

    expect(await screen.findByText('Nenhuma visita agendada.')).toBeOnTheScreen();
    expect(screen.queryByText('Nenhuma visita no histórico.')).not.toBeOnTheScreen();
    expect(screen.getByText('Visita inicial')).toBeOnTheScreen();
  });

  it('mostra o erro e tenta de novo', async () => {
    const servico = criarServico({
      listarVisitas: jest.fn().mockRejectedValueOnce(new Error('Falha de rede.')).mockResolvedValue([]),
    });
    const user = userEvent.setup();
    await render(<VisitasView servico={servico} token="jwt" />);

    expect(await screen.findByText('Falha de rede.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Nenhuma visita agendada.')).toBeOnTheScreen();
  });

  it('não mostra o local quando a visita não tem', async () => {
    const servico = criarServico({ listarVisitas: jest.fn().mockResolvedValue([visitas[1]]) });
    await render(<VisitasView servico={servico} token="jwt" />);

    const cartao = (await screen.findByText('Retorno de 7 dias')).parent;
    expect(cartao).toBeTruthy();
    expect(within(cartao!).queryByText(/Sala/)).not.toBeOnTheScreen();
  });
});
