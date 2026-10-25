import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
})
//Com isso, api.get('/estudos') chama http://localhost:8080/api/estudos.

// Envia o token da sessão salva pelo AuthProvider
api.interceptors.request.use((config) => {
  try {
    const salva = localStorage.getItem('clinicalstudypb.sessao') // mesma chave do AuthProvider
    const token = salva ? (JSON.parse(salva) as { token?: string }).token : null
    if (token) config.headers.Authorization = `Bearer ${token}`
  } catch {
    // sessão corrompida: segue sem token
  }
  return config
})
