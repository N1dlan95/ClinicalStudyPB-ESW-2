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
    const novo: UsuarioCadastrado = {
      id: Date.now(),
      nome: dados.nome,
      email: dados.email,
      perfil: dados.perfil,
      ativo: true,
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
    const atualizado: UsuarioCadastrado = {
      ...atual,
      nome: dados.nome,
      email: dados.email,
      perfil: dados.perfil,
    }
    usuariosFicticios = usuariosFicticios.map((u) => (u.id === id ? atualizado : u))
    return esperar(atualizado)
  }
  const resposta = await api.put<UsuarioCadastrado>(`/usuarios/${id}`, dados) // TODO
  return resposta.data
}
