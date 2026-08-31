import { afterEach, describe, expect, it, vi } from 'vitest'

import { HttpError } from '@/lib/http'
import { fetchOwnAccount, updateOwnAccount, validateDisplayName } from './api'

const ACCOUNT = {
  id: 'acc-1',
  email: 'ana@nexus.test',
  displayName: 'Ana Ramirez',
  firstNames: 'Ana',
  lastNames: 'Ramirez',
  status: 'ACTIVE',
  roles: ['PLAYER'],
}

const jsonResponse = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchOwnAccount', () => {
  it('pide GET /api/accounts/me y devuelve la cuenta', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(200, ACCOUNT))
    vi.stubGlobal('fetch', fetchImpl)

    const result = await fetchOwnAccount()

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/accounts/me',
      expect.objectContaining({ method: 'GET' }),
    )
    expect(result).toEqual(ACCOUNT)
  })

  it('propaga un 401 como HttpError no autorizado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { message: 'Falta el testimonio' })),
    )

    await expect(fetchOwnAccount()).rejects.toSatisfy(
      (error: unknown) => error instanceof HttpError && error.isUnauthorized,
    )
  })
})

describe('updateOwnAccount', () => {
  it('envia PATCH /api/accounts/me solo con displayName', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(200, { ...ACCOUNT, displayName: 'Ana Nueva' }))
    vi.stubGlobal('fetch', fetchImpl)

    const result = await updateOwnAccount({ displayName: 'Ana Nueva' })

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/accounts/me')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ displayName: 'Ana Nueva' })
    expect(result.displayName).toBe('Ana Nueva')
  })

  it('propaga el 409 de apodo en uso con el mensaje del servicio', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(409, { message: 'El apodo ya esta en uso.' })),
    )

    await expect(updateOwnAccount({ displayName: 'Duplicado' })).rejects.toThrow(
      'El apodo ya esta en uso.',
    )
  })
})

describe('validateDisplayName', () => {
  it('acepta un apodo dentro del rango', () => {
    expect(validateDisplayName('Ana Ramirez')).toBeNull()
  })

  it('rechaza por longitud fuera de rango', () => {
    expect(validateDisplayName('ab')).toMatch(/entre 3 y 32/u)
    expect(validateDisplayName('x'.repeat(33))).toMatch(/entre 3 y 32/u)
  })

  it('rechaza simbolos y delimitadores en los extremos', () => {
    expect(validateDisplayName('_ana')).not.toBeNull()
    expect(validateDisplayName('ana!')).not.toBeNull()
  })
})
