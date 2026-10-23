import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
})
//Com isso, api.get('/estudos') chama http://localhost:8080/api/estudos.