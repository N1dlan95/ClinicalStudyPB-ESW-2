import { SessaoExpiradaError, aoExpirarSessao } from '../../auth/sessaoExpirada';
import { ServicoError, participanteService } from '../participanteService';

// Modo API real, com o fetch simulado
jest.mock('../../../config/env', () => ({ API_URL: 'http://api.teste', USE_MOCK_API: false }));

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

function resposta(status: number, corpo: unknown = []): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => corpo } as unknown as Response;
}

beforeEach(() => fetchMock.mockReset());

describe('participanteService (API real)', () => {
  it('envia o token no cabeçalho Authorization', async () => {
    fetchMock.mockResolvedValue(resposta(200, []));

    await participanteService.listarEstudos('jwt-123');

    expect(fetchMock).toHaveBeenCalledWith('http://api.teste/api/participante/estudos', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer jwt-123' }),
    }));
  });

  it('401 avisa que a sessão expirou', async () => {
    const ouvinte = jest.fn();
    const cancelar = aoExpirarSessao(ouvinte);
    fetchMock.mockResolvedValue(resposta(401));

    await expect(participanteService.listarVisitas('jwt-vencido')).rejects.toBeInstanceOf(SessaoExpiradaError);
    expect(ouvinte).toHaveBeenCalledTimes(1);
    cancelar();
  });

  it('outros erros não encerram a sessão', async () => {
    const ouvinte = jest.fn();
    const cancelar = aoExpirarSessao(ouvinte);
    fetchMock.mockResolvedValue(resposta(500));

    await expect(participanteService.listarEstudos('jwt-123')).rejects.toBeInstanceOf(ServicoError);
    expect(ouvinte).not.toHaveBeenCalled();
    cancelar();
  });
});
