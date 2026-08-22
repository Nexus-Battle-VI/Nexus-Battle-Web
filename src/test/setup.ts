import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// React Testing Library no desmonta automaticamente entre pruebas cuando se
// usan los globales de Vitest: sin esto, el DOM de una prueba se filtra a la
// siguiente y las consultas devuelven elementos del caso anterior.
afterEach(() => {
  cleanup()
})
