import { afterEach, describe, expect, it, vi } from 'vitest'

import { applySanction } from './api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('API de sanciones', () => {
  it('envía el contrato de Account al gateway con el ID objetivo codificado', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'sanction-1',
          targetAccountId: 'account/1',
          actorAccountId: 'moderator-1',
          type: 'TEMPORARY_SUSPENSION',
          reason: 'Incumplimiento reiterado',
          createdAt: '2026-09-15T12:00:00.000Z',
          expiresAt: '2026-09-22T12:00:00.000Z',
          appealDeadline: '2026-10-15T12:00:00.000Z',
        }),
        { status: 201, headers: { 'content-type': 'application/json' } },
      ),
    )
    vi.stubGlobal('fetch', fetchImpl)

    await applySanction('account/1', {
      type: 'TEMPORARY_SUSPENSION',
      reason: 'Incumplimiento reiterado',
      suspensionDurationMinutes: 10_080,
    })

    expect(fetchImpl).toHaveBeenCalledWith(
      '/api/accounts/account%2F1/sanctions',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          type: 'TEMPORARY_SUSPENSION',
          reason: 'Incumplimiento reiterado',
          suspensionDurationMinutes: 10_080,
        }),
      }),
    )
  })
})
