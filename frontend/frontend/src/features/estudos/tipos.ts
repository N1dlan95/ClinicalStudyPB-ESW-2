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
