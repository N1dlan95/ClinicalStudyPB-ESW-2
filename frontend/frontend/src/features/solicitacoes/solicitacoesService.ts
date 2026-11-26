import { api } from '../../services/api'
import { ErroVisitaApi, traduzirErro } from '../visitas/visitasService'
import type { Solicitacao, StatusSolicitacao, TipoSolicitacao } from './tipos'

// Integração com as solicitações do participante (RF19, RF20). Só o coordenador lista e decide.

// Mensagens por código de erro da API. O que não estiver aqui usa a mensagem da API ou a do status.
const MENSAGEM_POR_CODIGO: Record<string, string> = {
  SOLICITACAO_JA_DECIDIDA:
    'Outra pessoa da equipe já decidiu esta solicitação. Atualize a lista para ver a decisão registrada.',
  PARTICIPANTE_JA_RETIRADO: 'O participante já foi retirado do estudo. Atualize a lista.',
  PARTICIPANTE_NAO_INCLUIDO: 'O participante não está mais incluído no estudo.',
  VISITA_NAO_AGENDADA: 'A visita já foi realizada, marcada como ausente ou cancelada e não pode ser reagendada.',
  ESTUDO_ENCERRADO: 'O estudo está encerrado: as solicitações não podem mais ser decididas.',
}

function traduzir(erro: unknown, mensagem400: string): ErroVisitaApi {
  const e = traduzirErro(erro)
  const mensagem =
    (e.codigo && MENSAGEM_POR_CODIGO[e.codigo]) ||
    (e.status === 400 ? mensagem400 : null) ||
    (e.status === 404 ? 'Solicitação não encontrada. Atualize a lista.' : null) ||
    e.message
  return new ErroVisitaApi(mensagem, e.status, e.codigo)
}

export async function listarSolicitacoes(
  estudoId: number,
  filtros: { status?: StatusSolicitacao; tipo?: TipoSolicitacao } = {},
): Promise<Solicitacao[]> {
  try {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined))
    return (await api.get<Solicitacao[]>(`/estudos/${estudoId}/solicitacoes`, { params })).data
  } catch (erro) {
    throw traduzir(erro, 'Filtro inválido. Limpe os filtros e tente de novo.')
  }
}

export async function aprovarSolicitacao(id: number): Promise<Solicitacao> {
  try {
    return (await api.post<Solicitacao>(`/solicitacoes/${id}/aprovacao`)).data
  } catch (erro) {
    throw traduzir(erro, 'Não foi possível aprovar a solicitação.')
  }
}

export async function recusarSolicitacao(id: number, justificativa: string): Promise<Solicitacao> {
  try {
    return (await api.post<Solicitacao>(`/solicitacoes/${id}/recusa`, { justificativa })).data
  } catch (erro) {
    throw traduzir(erro, 'Informe a justificativa da recusa (até 500 caracteres).')
  }
}
