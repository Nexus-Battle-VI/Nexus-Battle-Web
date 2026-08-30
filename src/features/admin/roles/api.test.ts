import { afterEach, describe, expect, it, vi } from 'vitest'

import { useSession } from '@/shared/session'
import { assignRole, findAccountByEmail, revokeRole } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
  useSession.setState({ accessToken: null, expiresAt: null })
})

const response = () =>
  new Response(
    JSON.stringify({
      id: 'account-1',
      email: 'persona@nexus.test',
      displayName: 'Persona',
      status: 'ACTIVE',
      roles: ['PLAYER'],
      mfaEnrolled: true,
    }),
    { status: 200 },
  )

describe('API de gestion de roles', () => {
  it('busca el correo codificado y envia el testimonio', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(response()))
    vi.stubGlobal('fetch', fetchImpl)
    useSession.setState({ accessToken: 'access-token', expiresAt: Date.now() + 60_000 })

    await findAccountByEmail('persona+rol@nexus.test')

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/accounts/search?email=persona%2Brol%40nexus.test',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ authorization: 'Bearer access-token' }),
      }),
    )
  })

  it('asigna el rol por POST y lo retira por DELETE', async () => {
    const fetchImpl = vi.fn().mockImplementation(() => Promise.resolve(response()))
    vi.stubGlobal('fetch', fetchImpl)

    await assignRole('account/1', 'MODERATOR')
    await revokeRole('account/1', 'MODERATOR')

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      '/api/accounts/account%2F1/roles',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ role: 'MODERATOR' }) }),
    )
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      '/api/accounts/account%2F1/roles/MODERATOR',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
