import { render, screen, userEvent } from '@testing-library/react-native';
import { EstudosView } from '../EstudosView';
import { criarServico, estudoIncluido } from '../__fixtures__/participante';

describe('<EstudosView />', () => {
  it('lista os estudos com responsável, participação e próxima visita (RF17)', async () => {
    const servico = criarServico();
    await render(<EstudosView servico={servico} token="jwt" nomeUsuario="Paula" onVerVisitas={jest.fn()} />);

    expect(await screen.findByText('Estudo de Controle Glicêmico')).toBeOnTheScreen();
    expect(screen.getByText('Olá, Paula')).toBeOnTheScreen();
    expect(screen.getByText('Responsável: Ana Pesquisadora')).toBeOnTheScreen();
    expect(screen.getByText('Participando')).toBeOnTheScreen();
    expect(screen.getByText('Desde 20/11/2026')).toBeOnTheScreen();
    expect(screen.getByText('30/12/2026 · 09:00 · Retorno de 30 dias')).toBeOnTheScreen();
    expect(servico.listarEstudos).toHaveBeenCalledWith('jwt');
    expect(servico.listarVisitas).not.toHaveBeenCalled();
  });

  it('mostra a participação retirada sem próxima visita', async () => {
    await render(<EstudosView servico={criarServico()} token="jwt" nomeUsuario="Paula" onVerVisitas={jest.fn()} />);

    expect(await screen.findByText('Estudo de Hipertensão')).toBeOnTheScreen();
    expect(screen.getByText('Retirado')).toBeOnTheScreen();
    expect(screen.getByText('Retirado em 02/03/2026')).toBeOnTheScreen();
    expect(screen.getByText('Estudo: Encerrado')).toBeOnTheScreen();
    expect(screen.getAllByText('Próxima visita')).toHaveLength(1);
  });

  it('abre as visitas pelo cartão do estudo', async () => {
    const onVerVisitas = jest.fn();
    const servico = criarServico({ listarEstudos: jest.fn().mockResolvedValue([estudoIncluido]) });
    const user = userEvent.setup();
    await render(<EstudosView servico={servico} token="jwt" nomeUsuario="Paula" onVerVisitas={onVerVisitas} />);

    await user.press(await screen.findByText('Ver visitas'));
    expect(onVerVisitas).toHaveBeenCalled();
  });

  it('mostra a mensagem de lista vazia', async () => {
    const servico = criarServico({ listarEstudos: jest.fn().mockResolvedValue([]) });
    await render(<EstudosView servico={servico} token="jwt" nomeUsuario="Paula" onVerVisitas={jest.fn()} />);

    expect(await screen.findByText('Você ainda não participa de nenhum estudo.')).toBeOnTheScreen();
  });

  it('mostra o erro e tenta de novo', async () => {
    const servico = criarServico({
      listarEstudos: jest.fn().mockRejectedValueOnce(new Error('Falha de rede.')).mockResolvedValue([estudoIncluido]),
    });
    const user = userEvent.setup();
    await render(<EstudosView servico={servico} token="jwt" nomeUsuario="Paula" onVerVisitas={jest.fn()} />);

    expect(await screen.findByText('Falha de rede.')).toBeOnTheScreen();
    await user.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByText('Estudo de Controle Glicêmico')).toBeOnTheScreen();
  });
});
