// Formatos alinhados ao contrato da API (Docs/ClinicalStudyPB-Docs/api/openapi.yaml, schemas Estudo e EstudoEntrada)

// Estados do estudo (schema EstadoEstudo). O estudo nasce em PLANEJAMENTO;
// a mudança de estado tem rota própria (RF07), então o formulário não altera o estado.
export type EstadoEstudo = 'PLANEJAMENTO' | 'RECRUTAMENTO' | 'EXECUCAO' | 'ENCERRADO'

export const ROTULO_ESTADO: Record<EstadoEstudo, string> = {
  PLANEJAMENTO: 'Planejamento',
  RECRUTAMENTO: 'Recrutamento',
  EXECUCAO: 'Em execução',
  ENCERRADO: 'Encerrado',
}

export interface ResponsavelResumo {
  id: number
  nome: string
}

export interface Estudo {
  id: number
  titulo: string
  objetivo: string
  responsavel: ResponsavelResumo
  dataInicio: string // ISO: aaaa-mm-dd
  dataFim: string | null // ISO: aaaa-mm-dd (opcional no contrato)
  limiteParticipantes: number
  estado: EstadoEstudo
}

// Dados enviados ao criar/editar (schema EstudoEntrada). O estado não vem do cliente.
export interface EstudoEntrada {
  titulo: string
  objetivo: string
  responsavelId: number
  dataInicio: string
  dataFim: string | null
  limiteParticipantes: number
}

// Pesquisador que pode ser responsável (usuário ativo com perfil PESQUISADOR)
export interface Pesquisador {
  id: number
  nome: string
}

// Estado dos campos do formulário (tudo texto, como o usuário digita)
export interface FormularioEstudo {
  titulo: string
  objetivo: string
  responsavelId: string
  dataInicio: string // dd/mm/aaaa
  dataFim: string // dd/mm/aaaa (opcional)
  limiteParticipantes: string
}

export type CampoEstudo = keyof FormularioEstudo
export type ErrosEstudo = Partial<Record<CampoEstudo, string>>

// Transições válidas entre estados do estudo (RF07, EstudoService.java e openapi.yaml)
export const TRANSICOES_ESTADO: Record<EstadoEstudo, EstadoEstudo[]> = {
  PLANEJAMENTO: ['RECRUTAMENTO'],
  RECRUTAMENTO: ['PLANEJAMENTO', 'EXECUCAO'],
  EXECUCAO: ['ENCERRADO'],
  ENCERRADO: [],
}

export const DESCRICAO_ESTADO: Record<EstadoEstudo, string> = {
  PLANEJAMENTO:
    'Definição do protocolo: cadastro de critérios de elegibilidade e visitas previstas antes de iniciar o recrutamento.',
  RECRUTAMENTO:
    'Aberto para triagem: cadastro de candidatos, avaliação de elegibilidade, registro de consentimento e inclusão até o limite de vagas.',
  EXECUCAO:
    'Acompanhamento clínico dos participantes incluídos conforme o cronograma de visitas previstas.',
  ENCERRADO:
    'Ciclo finalizado. O estudo fica disponível apenas para consulta e não permite novas alterações.',
}

// Critérios de inclusão e exclusão (RF05, schema Criterio e CriterioEntrada)
export type TipoCriterio = 'INCLUSAO' | 'EXCLUSAO'

export const ROTULO_TIPO_CRITERIO: Record<TipoCriterio, string> = {
  INCLUSAO: 'Inclusão',
  EXCLUSAO: 'Exclusão',
}

export interface Criterio {
  id: number
  tipo: TipoCriterio
  descricao: string
  ordem: number
}

export interface CriterioEntrada {
  tipo: TipoCriterio
  descricao: string
  ordem?: number | null
}

// Visitas previstas e atividades do protocolo (RF06, schema VisitaPrevista e VisitaPrevistaEntrada)
export interface Atividade {
  id?: number
  ordem: number
  descricao: string
}

export interface AtividadeEntrada {
  ordem: number
  descricao: string
}

export interface VisitaPrevista {
  id: number
  ordem: number
  nome: string
  diaPrevisto: number
  janelaDias: number | null
  descricao: string | null
  atividades: Atividade[]
}

export interface VisitaPrevistaEntrada {
  ordem: number
  nome: string
  diaPrevisto: number
  janelaDias: number | null
  descricao: string | null
  atividades: AtividadeEntrada[]
}

