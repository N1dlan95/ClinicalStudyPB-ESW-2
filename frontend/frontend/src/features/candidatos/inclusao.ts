import type { Estudo } from '../estudos/tipos'
import type { ErroCandidatoApi } from './candidatosService'
import type { Candidato } from './tipos'

// Bloqueios da inclusão (RF11), na mesma ordem em que o backend valida (task 3565)
export type BloqueioInclusao = 'FORA_DE_RECRUTAMENTO' | 'NAO_ELEGIVEL' | 'SEM_CONSENTIMENTO' | 'VAGAS_ESGOTADAS'

export const MENSAGEM_BLOQUEIO: Record<BloqueioInclusao, { titulo: string; texto: string }> = {
  FORA_DE_RECRUTAMENTO: {
    titulo: 'Estudo fora de recrutamento',
    texto: 'A inclusão só fica liberada quando o estudo estiver em Recrutamento.',
  },
  NAO_ELEGIVEL: {
    titulo: 'Candidato não elegível',
    texto: 'Só é possível incluir candidatos avaliados como elegíveis.',
  },
  SEM_CONSENTIMENTO: {
    titulo: 'Consentimento não registrado',
    texto: 'Registre o consentimento do candidato antes de incluir.',
  },
  VAGAS_ESGOTADAS: {
    titulo: 'Vagas esgotadas',
    texto: 'Todas as vagas do estudo estão ocupadas. Para incluir, aumente o limite na edição do estudo.',
  },
}

// O que a tela já sabe antes de chamar a API (o backend confere de novo)
export function bloqueioInclusao(
  candidato: Candidato,
  estudo: Estudo | null,
  ocupadas: number | null,
): BloqueioInclusao | null {
  if (estudo && estudo.estado !== 'RECRUTAMENTO') return 'FORA_DE_RECRUTAMENTO'
  if (candidato.status !== 'ELEGIVEL') return 'NAO_ELEGIVEL'
  if (!candidato.consentimento) return 'SEM_CONSENTIMENTO'
  if (estudo && ocupadas !== null && ocupadas >= estudo.limiteParticipantes) return 'VAGAS_ESGOTADAS'
  return null
}

// Traduz o código de erro da API para um dos bloqueios. Os códigos exatos ainda não estão no
// contrato; a busca por trechos cobre variações como ESTUDO_FORA_DE_RECRUTAMENTO ou SEM_VAGAS.
export function bloqueioDoErro(erro: ErroCandidatoApi): BloqueioInclusao | null {
  const codigo = (erro.codigo ?? '').toUpperCase()
  if (!codigo) return null
  if (codigo.includes('RECRUTAMENTO')) return 'FORA_DE_RECRUTAMENTO'
  if (codigo.includes('ELEGIVEL')) return 'NAO_ELEGIVEL'
  if (codigo.includes('CONSENTIMENTO')) return 'SEM_CONSENTIMENTO'
  if (codigo.includes('VAGA') || codigo.includes('LIMITE')) return 'VAGAS_ESGOTADAS'
  return null
}

// Mensagem para o aviso de erro: título do bloqueio + texto da API. Quando a API não manda texto
// próprio (só o genérico do serviço), usa a explicação padrão do bloqueio.
const GENERICAS = new Set([
  'Revise os dados informados.',
  'A operação conflita com uma regra do estudo.',
])

export function mensagemErroInclusao(erro: ErroCandidatoApi): { titulo: string; texto: string } {
  const bloqueio = bloqueioDoErro(erro)
  if (!bloqueio) return { titulo: 'Não foi possível incluir o candidato', texto: erro.message }
  const padrao = MENSAGEM_BLOQUEIO[bloqueio]
  return { titulo: padrao.titulo, texto: GENERICAS.has(erro.message) ? padrao.texto : erro.message }
}
