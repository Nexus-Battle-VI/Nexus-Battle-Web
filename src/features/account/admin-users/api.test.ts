import { afterEach, describe, expect, it, vi } from 'vitest'

import { httpClient } from '@/lib/http'
import {
  buildAdminAccountsQuery,
  downloadAdminAccounts,
  fetchAdminAccounts,
  type AdminAccountsResponse,
} from './api'

const RESPONSE: AdminAccountsResponse = {
  items: [],
  statusCounts: { pendingVerification: 0, active: 0, suspended: 0 },
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('contrato administrativo de cuentas', () => {
  it('construye criterios soportados en orden determinista y correctamente codificados', () => {
    expect(
      buildAdminAccountsQuery({
        id: 'acc/uno',
        email: 'persona+admin@nexus.test',
        firstNames: 'Ana Maria',
        lastNames: 'Vega Rios',
        displayName: 'Capitana Panel',
        role: 'ADMINISTRATOR',
        status: 'SUSPENDED',
      }),
    ).toBe(
      '?id=acc%2Funo&email=persona%2Badmin%40nexus.test&firstNames=Ana+Maria&lastNames=Vega+Rios&nickname=Capitana+Panel&role=ADMINISTRATOR&status=SUSPENDED',
    )
  })

  it('omite valores vacios y no inventa paginacion, fecha, sanciones ni busqueda global', () => {
    const query = buildAdminAccountsQuery({
      id: '  ',
      email: '',
      displayName: 'Panel',
    })

    expect(query).toBe('?nickname=Panel')
    expect(query).not.toMatch(/page|limit|offset|registeredAt|sanction|banned|search/iu)
  })

  it('consulta GET /accounts con httpClient, criterios y AbortSignal', async () => {
    const signal = new AbortController().signal
    const get = vi.spyOn(httpClient, 'get').mockResolvedValue(RESPONSE)

    await expect(
      fetchAdminAccounts({ email: 'persona+admin@nexus.test', role: 'ADMINISTRATOR' }, signal),
    ).resolves.toEqual(RESPONSE)

    expect(get).toHaveBeenCalledWith(
      '/accounts?email=persona%2Badmin%40nexus.test&role=ADMINISTRATOR',
      signal,
    )
  })

  it('exporta con /accounts/export y exactamente los mismos criterios aplicados', async () => {
    const signal = new AbortController().signal
    const file = {
      content: new Blob(['[]'], { type: 'application/json' }),
      filename: 'nexus-battles-users.json',
      mediaType: 'application/json; charset=utf-8',
    }
    const download = vi.spyOn(httpClient, 'download').mockResolvedValue(file)
    const criteria = {
      firstNames: 'Ana Maria',
      displayName: 'Capitana Panel',
      status: 'ACTIVE',
    } as const

    await expect(downloadAdminAccounts(criteria, signal)).resolves.toEqual(file)
    expect(download).toHaveBeenCalledWith(
      '/accounts/export?firstNames=Ana+Maria&nickname=Capitana+Panel&status=ACTIVE',
      signal,
    )
  })
})
