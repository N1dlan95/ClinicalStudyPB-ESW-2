/**
 * Aviso de sessão expirada (token vencido ou encerrado no logout).
 *
 * Os serviços chamam notificarSessaoExpirada() quando a API responde 401, e o AuthProvider
 * se inscreve em aoExpirarSessao() para limpar a sessão e voltar ao login.
 */
export const MENSAGEM_SESSAO_EXPIRADA = 'Sua sessão expirou. Entre novamente.';

export class SessaoExpiradaError extends Error {
  constructor() {
    super(MENSAGEM_SESSAO_EXPIRADA);
    this.name = 'SessaoExpiradaError';
  }
}

type Ouvinte = () => void;
const ouvintes = new Set<Ouvinte>();

/** Inscreve um ouvinte e devolve a função que cancela a inscrição. */
export function aoExpirarSessao(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function notificarSessaoExpirada(): void {
  ouvintes.forEach((ouvinte) => ouvinte());
}
