import { afterEach, describe, expect, it, vi } from 'vitest'
import { MutationObserver } from '@tanstack/react-query'

import { createQueryClient } from './query-client'

vi.mock('./sound', () => ({ playSfx: vi.fn() }))

const { playSfx } = await import('./sound')

afterEach(() => {
  vi.mocked(playSfx).mockClear()
})

const run = async (
  mutationFn: () => Promise<unknown>,
  meta?: Record<string, unknown>,
): Promise<void> => {
  const observer = new MutationObserver(createQueryClient(), {
    mutationFn,
    ...(meta === undefined ? {} : { meta }),
  })
  await observer.mutate().catch(() => undefined)
}

describe('sonido de las mutaciones (EN-031)', () => {
  it('una mutacion que termina bien pide el sonido de exito', async () => {
    await run(() => Promise.resolve('ok'))

    expect(playSfx).toHaveBeenCalledWith('success')
  })

  it('una mutacion que falla pide el sonido de error', async () => {
    await run(() => Promise.reject(new Error('fallo')))

    expect(playSfx).toHaveBeenCalledWith('error')
  })

  it('una mutacion automatica con meta.sfx = false no suena', async () => {
    await run(() => Promise.resolve('ok'), { sfx: false })
    await run(() => Promise.reject(new Error('fallo')), { sfx: false })

    expect(playSfx).not.toHaveBeenCalled()
  })
})
