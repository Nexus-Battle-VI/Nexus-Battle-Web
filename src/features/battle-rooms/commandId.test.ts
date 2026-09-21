import { afterEach, describe, expect, it, vi } from 'vitest'

import { newCommandId } from './commandId'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('newCommandId — identificador de un comando (ADR-020), no aleatoriedad de juego', () => {
  it('delega en `crypto.randomUUID` y devuelve un id distinto en cada llamada', () => {
    let count = 0

    vi.stubGlobal('crypto', { randomUUID: () => `id-${String((count += 1))}` })

    expect(newCommandId()).toBe('id-1')
    expect(newCommandId()).toBe('id-2')
  })

  it('con la implementacion real produce un UUID de 36 caracteres (cabe en el limite de 1 a 100 del contrato)', () => {
    if (typeof globalThis.crypto.randomUUID !== 'function') {
      return
    }

    const id = newCommandId()

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u)
    expect(id.length).toBeGreaterThanOrEqual(1)
    expect(id.length).toBeLessThanOrEqual(100)
  })
})
