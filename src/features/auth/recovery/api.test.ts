import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  resetRecoveryPassword,
  startRecovery,
  verifyRecoveryAnswers,
  verifyRecoveryCode,
} from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })

describe('api de recuperacion', () => {
  it('inicia el proceso contra /accounts/recovery', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        challengeToken: 'tok-1',
        questions: [{ id: 'sq-01', statement: '¿Mascota?' }],
      }),
    )
    vi.stubGlobal('fetch', fetchImpl)

    const result = await startRecovery('ana@nexus.test')

    expect(result.challengeToken).toBe('tok-1')
    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/accounts/recovery',
      expect.objectContaining({ method: 'POST' }),
    )
    const init = fetchImpl.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(init.body as string)).toMatchObject({ email: 'ana@nexus.test' })
  })

  it('envia respuestas, codigo y nueva contrasena a sus rutas', async () => {
    const fetchImpl = vi
      .fn()
      .mockImplementation(() => Promise.resolve(jsonResponse({ challengeToken: 'tok-1' })))
    vi.stubGlobal('fetch', fetchImpl)

    await verifyRecoveryAnswers('tok-1', [{ questionId: 'sq-01', answer: 'luna' }])
    await verifyRecoveryCode('tok-1', '000000')
    await resetRecoveryPassword('tok-1', 'NuevaClave9!')

    expect(fetchImpl.mock.calls[0]?.[0]).toBe('/api/accounts/recovery/answers')
    expect(fetchImpl.mock.calls[1]?.[0]).toBe('/api/accounts/recovery/code')
    expect(fetchImpl.mock.calls[2]?.[0]).toBe('/api/accounts/recovery/password')
  })
})
