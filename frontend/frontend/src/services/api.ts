import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
})
//Com isso, api.get('/estudos') chama http://localhost:8080/api/estudos.

const CHAVE_SESSAO = 'clinicalstudypb.sessao' // mesma chave do AuthProvider

// Envia o token da sessão salva pelo AuthProvider
api.interceptors.request.use((config) => {
  try {
    const salva = localStorage.getItem(CHAVE_SESSAO)
    const token = salva ? (JSON.parse(salva) as { token?: string }).token : null
    if (token && !config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`
  } catch {
    // sessão corrompida: segue sem token
  }
  return config
})

// Token expirado ou encerrado (401): apaga a sessão e volta para o login.
// O próprio login e o logout tratam o 401 deles.
api.interceptors.response.use(undefined, (erro) => {
  const rota: string = erro?.config?.url ?? ''
  if (erro?.response?.status === 401 && !rota.startsWith('/auth/')) {
    localStorage.removeItem(CHAVE_SESSAO)
    window.location.assign('/login')
  }
  return Promise.reject(erro)
})
