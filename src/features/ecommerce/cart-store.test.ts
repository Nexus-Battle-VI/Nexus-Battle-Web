import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteNamedCart,
  loadActiveCart,
  loadNamedCarts,
  saveActiveCart,
  upsertNamedCart,
} from './cart-store'

function memoryStorage() {
  const store = new Map<string, string>()
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value)
    },
    removeItem: (key: string) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  vi.stubGlobal('sessionStorage', memoryStorage())
})

describe('carrito activo', () => {
  it('persiste y recupera por dueño', () => {
    saveActiveCart('cliente-a', [{ id: 'p01', qty: 2 }])
    expect(loadActiveCart('cliente-a')).toEqual([{ id: 'p01', qty: 2 }])
    expect(loadActiveCart('cliente-b')).toEqual([])
  })
})

describe('carritos con nombre', () => {
  it('no guarda vacío ni sin nombre', () => {
    expect(upsertNamedCart('cliente-a', '  ', [{ id: 'p01', qty: 1 }])).toBe(
      'Escribe un nombre para el carrito.',
    )
    expect(upsertNamedCart('cliente-a', 'raid', [])).toBe('No puedes guardar un carrito vacío.')
  })

  it('guarda, carga y aísla por identidad', () => {
    const saved = upsertNamedCart('cliente-a', 'Raid', [{ id: 'p01', qty: 1 }])
    expect(typeof saved).not.toBe('string')
    expect(loadNamedCarts('cliente-a')).toHaveLength(1)
    expect(loadNamedCarts('cliente-a')[0]?.name).toBe('Raid')
    expect(loadNamedCarts('cliente-b')).toHaveLength(0)
  })

  it('actualiza el mismo nombre sin duplicar', () => {
    upsertNamedCart('cliente-a', 'Raid', [{ id: 'p01', qty: 1 }])
    upsertNamedCart('cliente-a', 'raid', [{ id: 'p02', qty: 3 }])
    const list = loadNamedCarts('cliente-a')
    expect(list).toHaveLength(1)
    expect(list[0]?.items).toEqual([{ id: 'p02', qty: 3 }])
  })

  it('elimina solo el carrito del dueño', () => {
    const a = upsertNamedCart('cliente-a', 'A', [{ id: 'p01', qty: 1 }])
    upsertNamedCart('cliente-b', 'B', [{ id: 'p02', qty: 1 }])
    if (typeof a === 'string') throw new Error(a)
    deleteNamedCart('cliente-a', a.id)
    expect(loadNamedCarts('cliente-a')).toHaveLength(0)
    expect(loadNamedCarts('cliente-b')).toHaveLength(1)
  })
})
