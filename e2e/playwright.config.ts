import { defineConfig, devices } from '@playwright/test'

// Task 3574: E2E web contra o ambiente do Docker Compose (frontend em 3000, que repassa /api ao backend).
// Para rodar contra o Vite (npm run dev), use E2E_BASE_URL=http://localhost:5173.
export default defineConfig({
  testDir: './tests',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  // O fluxo é um só e mexe no banco: roda em sequência
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    locale: 'pt-BR',
    screenshot: 'on',
    video: 'on',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
