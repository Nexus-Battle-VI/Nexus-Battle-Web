import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import { clearAvatarCache } from '@/components/ui/avatarCache'
import type * as RealtimeApiModule from '@/features/auction/realtime/api'
import { HttpError } from '@/lib/http'
import { resetLanguageForTests } from '@/shared/i18n/testing'

// EN-034: las pantallas de Subasta abren una conexion en vivo (ticket + WebSocket). Salvo que una
// prueba diga lo contrario, aqui se simula el servidor con el realtime APAGADO -el ticket responde
// 404-, que es exactamente como se comportaban esas pantallas antes: la conexion queda
// `disabled`, sin indicador, sin reintentos y sin sondeo. Las pruebas del realtime lo
// sobrescriben con `vi.mocked(issueAuctionRealtimeTicket)`.
vi.mock('@/features/auction/realtime/api', async (importOriginal) => {
  const original = await importOriginal<typeof RealtimeApiModule>()

  return {
    ...original,
    issueAuctionRealtimeTicket: vi.fn(() =>
      Promise.reject(new HttpError(404, 'Realtime de Subasta apagado', null)),
    ),
  }
})

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
  // Los avatares se cachean por ruta durante la sesion: una prueba no debe
  // heredar la descarga (ni el 404) de la anterior.
  clearAvatarCache()
  // Cada prueba arranca en español, el idioma por defecto del producto: una
  // prueba que cambia de idioma no debe dejar la siguiente en otro.
  resetLanguageForTests()
})
