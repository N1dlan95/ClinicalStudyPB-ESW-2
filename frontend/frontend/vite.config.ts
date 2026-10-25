import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8080' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
})
//O React roda na porta 5173 e o Spring na 8080. Para o navegador, são “origens” diferentes, e ele bloqueia a chamada (erro de CORS). 
// Para o desenvolvimento, a solução mais simples é um proxy no Vite: o navegador chama o próprio Vite, e ele repassa ao backend.