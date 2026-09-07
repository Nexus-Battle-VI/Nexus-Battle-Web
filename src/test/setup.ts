import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom no implementa la apertura/cierre modal nativo. La aplicacion sigue
// usando HTMLDialogElement; solo el entorno de pruebas refleja su estado open.
Object.defineProperties(HTMLDialogElement.prototype, {
  showModal: {
    configurable: true,
    writable: true,
    value: function showModal(this: HTMLDialogElement): void {
      this.setAttribute('open', '')
    },
  },
  close: {
    configurable: true,
    writable: true,
    value: function close(this: HTMLDialogElement): void {
      this.removeAttribute('open')
    },
  },
})

// React Testing Library no desmonta automaticamente entre pruebas cuando se
// usan los globales de Vitest: sin esto, el DOM de una prueba se filtra a la
// siguiente y las consultas devuelven elementos del caso anterior.
afterEach(() => {
  cleanup()
})
