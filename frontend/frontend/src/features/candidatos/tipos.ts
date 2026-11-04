// Candidatos de um estudo (RF08).
// CONTRATO PROVISÓRIO: a API de candidatos está sendo feita na task 3558 (backend) e ainda não está
// no openapi.yaml. Os formatos abaixo seguem a descrição dessa task: candidato com nome, e-mail,
// telefone, data de nascimento e status, nas rotas /estudos/{id}/candidatos, com filtro por status.
// Quando o contrato sair, ajuste só este arquivo e o candidatosService.ts.

// Estados do candidato (MER-v1.md, seção 4.2)
export type StatusCandidato = 'CADASTRADO' | 'ELEGIVEL' | 'INELEGIVEL' | 'INCLUIDO' | 'RETIRADO'

export const ROTULO_STATUS_CANDIDATO: Record<StatusCandidato, string> = {
  CADASTRADO: 'Cadastrado',
  ELEGIVEL: 'Elegível',
  INELEGIVEL: 'Inelegível',
  INCLUIDO: 'Incluído',
  RETIRADO: 'Retirado',
}

// Consentimento simulado (RF10). Backend: task 3563, POST /candidatos/{id}/consentimento,
// que grava a data e o usuário que registrou.
export interface Consentimento {
  registradoEm: string // ISO (data ou data e hora)
  registradoPor: string | null // nome de quem registrou
}

export interface Candidato {
  id: number
  nome: string
  email: string
  telefone: string | null
  dataNascimento: string // ISO: aaaa-mm-dd
  status: StatusCandidato
  consentimento?: Consentimento | null // ausente ou null: ainda não registrado
  dataInclusao?: string | null // ISO; preenchida quando o status vira INCLUIDO (task 3565)
}

// Resposta da inclusão (task 3565): vagas ocupadas e total depois de incluir
export interface ResultadoInclusao {
  vagasOcupadas: number
  limiteParticipantes: number
}

// Dados enviados ao cadastrar/editar. O status não vem do cliente (muda pela avaliação e inclusão).
export interface CandidatoEntrada {
  nome: string
  email: string
  telefone: string | null
  dataNascimento: string
}

// Estado dos campos do formulário (tudo texto, como o usuário digita)
export interface FormularioCandidato {
  nome: string
  email: string
  telefone: string
  dataNascimento: string // dd/mm/aaaa
}

export type CampoCandidato = keyof FormularioCandidato
export type ErrosCandidato = Partial<Record<CampoCandidato, string>>
