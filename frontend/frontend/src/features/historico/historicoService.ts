import { api } from '../../services/api'
import { traduzirErro } from '../visitas/visitasService'
import type { Historico } from './tipos'

// RF15 (task 3765 do backend). Pesquisador, coordenador e administrador (somente leitura).
// 409 PARTICIPANTE_NAO_INCLUIDO: o candidato nunca foi incluído no estudo.
export async function buscarHistorico(candidatoId: number): Promise<Historico> {
  try {
    return (await api.get<Historico>(`/candidatos/${candidatoId}/historico`)).data
  } catch (erro) {
    throw traduzirErro(erro)
  }
}
