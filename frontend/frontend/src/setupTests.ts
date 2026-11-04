// Roda antes de cada arquivo de teste
import '@testing-library/jest-dom/vitest' // habilita expect(...).toBeInTheDocument() e afins
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Desmonta o que foi renderizado para um teste não interferir no outro
afterEach(() => {
  cleanup()
  localStorage.clear()
})
