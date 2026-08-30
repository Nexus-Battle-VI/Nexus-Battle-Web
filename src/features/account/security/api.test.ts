import { afterEach, describe, expect, it, vi } from 'vitest'

import { confirmTotp, enrollTotp } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('enrollTotp', () => {
  it('pide asociar un autenticador a POST /accounts/mfa/totp y devuelve el secreto', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ otpauthUri: 'otpauth://totp/x', secret: 'ABC123' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    vi.stubGlobal('fetch', fetchImpl)

    const result = await enrollTotp()

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/accounts/mfa/totp',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(result).toEqual({ otpauthUri: 'otpauth://totp/x', secret: 'ABC123' })
  })
})

describe('confirmTotp', () => {
  it('envia el codigo como JSON a POST /accounts/mfa/totp/verification', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ status: 'CONFIRMED' }), { status: 200 }))

    vi.stubGlobal('fetch', fetchImpl)

    await confirmTotp('123456')

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/accounts/mfa/totp/verification',
      expect.objectContaining({ method: 'POST' }),
    )

    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit

    expect((init.headers as Record<string, string> | undefined)?.['content-type']).toBe(
      'application/json',
    )
    expect(JSON.parse(init.body as string)).toEqual({ code: '123456' })
  })
})
