import { api } from '../../services/api'
import type { UsuarioCadastrado, UsuarioEntrada } from './tipos'

// ---------------------------------------------------------------------------
// Enquanto os endpoints de usuários não estão prontos (task 3218), as telas
// rodam com dados fictícios (em memória). Quando a API estiver pronta, troque
// para false e ajuste as rotas/formatos marcados com TODO.
// ---------------------------------------------------------------------------
const USAR_DADOS_FICTICIOS = true

// ---------------------------------------------------------------------------
// Dados fictícios (espelham os exemplos do Figma)
// ---------------------------------------------------------------------------
let usuariosFicticios: UsuarioCadastrado[] = [
  {
    id: 1,
    nome: 'Coordenação Demo',
    email: 'coordenacao@clinicalstudy.pb',
    perfil: 'ADMINISTRADOR',
    ativo: true,
    criadoEm: '2026-09-01',
    ultimoAcesso: '2026-10-22T08:42',
  },
  {
    id: 2,
    nome: 'Pesquisadora Demo',
    email: 'pesquisadora@clinicalstudy.pb',
    perfil: 'PESQUISADOR',
    ativo: true,
    criadoEm: '2026-10-15',
    ultimoAcesso: '2026-10-21T17:10',
  },
  {
    id: 3,
    nome: 'Monitor Demo',
    email: 'monitor@clinicalstudy.pb',
    perfil: 'COORDENADOR',
    ativo: true,
    criadoEm: '2026-10-01',
    ultimoAcesso: '2026-10-20T10:05',
  },
  {
    id: 4,
    nome: 'Participante Demo',
    email: 'participante@clinicalstudy.pb',
    perfil: 'PARTICIPANTE',
    ativo: true,
    criadoEm: '2026-10-10',
    ultimoAcesso: '2026-10-19T19:31',
  },
  {
    id: 5,
    nome: 'Antigo Pesquisador Demo',
    email: 'antigo@clinicalstudy.pb',
    perfil: 'PESQUISADOR',
    ativo: false,
    criadoEm: '2026-01-20',
    ultimoAcesso: '2026-06-30T14:20',
  },
]

// Erro de e-mail repetido: a tela usa o id para o link "Ver usuário existente"
export class EmailDuplicadoError extends Error {
  readonly usuarioExistenteId: number

  constructor(usuarioExistenteId: number) {
    super('E-mail já cadastrado')
    this.usuarioExistenteId = usuarioExistenteId
  }
}

function procurarEmailRepetido(email: string, ignorarId?: number) {
  const procurado = email.trim().toLowerCase()
  return usuariosFicticios.find((u) => u.id !== ignorarId && u.email.toLowerCase() === procurado)
}

function esperar<T>(valor: T): Promise<T> {
  return new Promise((resolver) => setTimeout(() => resolver(valor), 200))
}

// ---------------------------------------------------------------------------
// Funções usadas pelas telas
// ---------------------------------------------------------------------------
export async function listarUsuarios(): Promise<UsuarioCadastrado[]> {
  if (USAR_DADOS_FICTICIOS) return esperar([...usuariosFicticios])
  const resposta = await api.get<UsuarioCadastrado[]>('/usuarios') // TODO: confirmar rota e formato
  return resposta.data
}

export async function buscarUsuario(id: number): Promise<UsuarioCadastrado> {
  if (USAR_DADOS_FICTICIOS) {
    const usuario = usuariosFicticios.find((u) => u.id === id)
    if (!usuario) throw new Error('Usuário não encontrado')
    return esperar({ ...usuario })
  }
  const resposta = await api.get<UsuarioCadastrado>(`/usuarios/${id}`) // TODO
  return resposta.data
}

export async function criarUsuario(dados: UsuarioEntrada): Promise<UsuarioCadastrado> {
  if (USAR_DADOS_FICTICIOS) {
    const repetido = procurarEmailRepetido(dados.email)
    if (repetido) throw new EmailDuplicadoError(repetido.id)
    const novo: UsuarioCadastrado = {
      id: Date.now(),
      nome: dados.nome,
      email: dados.email,
      perfil: dados.perfil,
      ativo: dados.ativo,
      criadoEm: new Date().toISOString().slice(0, 10),
      ultimoAcesso: null,
    }
    usuariosFicticios = [...usuariosFicticios, novo]
    return esperar(novo)
  }
  const resposta = await api.post<UsuarioCadastrado>('/usuarios', dados) // TODO
  return resposta.data
}

export async function atualizarUsuario(id: number, dados: UsuarioEntrada): Promise<UsuarioCadastrado> {
  if (USAR_DADOS_FICTICIOS) {
    const atual = usuariosFicticios.find((u) => u.id === id)
    if (!atual) throw new Error('Usuário não encontrado')
    const repetido = procurarEmailRepetido(dados.email, id)
    if (repetido) throw new EmailDuplicadoError(repetido.id)
    const atualizado: UsuarioCadastrado = {
      ...atual,
      nome: dados.nome,
      email: dados.email,
      perfil: dados.perfil,
      ativo: dados.ativo,
    }
    usuariosFicticios = usuariosFicticios.map((u) => (u.id === id ? atualizado : u))
    return esperar(atualizado)
  }
  const resposta = await api.put<UsuarioCadastrado>(`/usuarios/${id}`, dados) // TODO
  return resposta.data
}

export async function enviarLinkRedefinicaoSenha(id: number): Promise<void> {
  if (USAR_DADOS_FICTICIOS) {
    if (!usuariosFicticios.some((u) => u.id === id)) throw new Error('Usuário não encontrado')
    await esperar(undefined)
    return
  }
  await api.post(`/usuarios/${id}/redefinir-senha`) // TODO
}
