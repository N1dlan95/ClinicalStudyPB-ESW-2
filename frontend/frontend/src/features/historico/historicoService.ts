import { api } from '../../services/api'
import { ErroVisitaApi, traduzirErro } from '../visitas/visitasService'
import type { Historico, ResultadoRetirada } from './tipos'

// RF15 (task 3765 do backend). Pesquisador, coordenador e administrador (somente leitura).
// 409 PARTICIPANTE_NAO_INCLUIDO: o candidato nunca foi incluído no estudo.
export async function buscarHistorico(candidatoId: number): Promise<Historico> {
  try {
    return (await api.get<Historico>(`/candidatos/${candidatoId}/historico`)).data
  } catch (erro) {
    throw traduzirErro(erro)
  }
}

// Mensagens da retirada por código de erro da API. O que não estiver aqui usa a mensagem da API.
const MENSAGEM_RETIRADA: Record<string, string> = {
  PARTICIPANTE_JA_RETIRADO:
    'Outra pessoa da equipe registrou a retirada enquanto este diálogo estava aberto. Atualize a página para ver a retirada registrada.',
  PARTICIPANTE_NAO_INCLUIDO: 'Só é possível registrar a retirada de quem está incluído no estudo.',
}

// RF16 (task 3768 do backend). Só o coordenador. Cancela as visitas AGENDADAS e libera a vaga.
export async function registrarRetirada(candidatoId: number, motivo: string): Promise<ResultadoRetirada> {
  try {
    return (await api.post<ResultadoRetirada>(`/candidatos/${candidatoId}/retirada`, { motivo })).data
  } catch (erro) {
    const e = traduzirErro(erro)
    const mensagem =
      (e.codigo && MENSAGEM_RETIRADA[e.codigo]) ||
      (e.status === 400 ? 'Informe o motivo da retirada (até 500 caracteres).' : e.message)
    throw new ErroVisitaApi(mensagem, e.status, e.codigo)
  }
}
