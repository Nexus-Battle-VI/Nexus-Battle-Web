import { describe, expect, it } from 'vitest'

import { COMBAT_REALTIME_PATH, buildRealtimeUrl } from './realtime'

describe('buildRealtimeUrl', () => {
  it('por defecto apunta al WebSocket de Combat (ADR-020), sin credenciales ni consulta', () => {
    const url = new URL(buildRealtimeUrl('https://nexus.example.test'))

    expect(url.protocol).toBe('wss:')
    expect(url.pathname).toBe('/api/v1/combat/realtime')
    expect(url.pathname).toBe(`/api${COMBAT_REALTIME_PATH}`)
    expect(url.search).toBe('')
  })

  it('usa ws: sobre http: y wss: sobre https:', () => {
    expect(buildRealtimeUrl('http://localhost:5173')).toMatch(/^ws:\/\//u)
    expect(buildRealtimeUrl('https://nexus.example.test')).toMatch(/^wss:\/\//u)
  })

  it('admite otra ruta bajo el mismo prefijo: el WebSocket de Subasta (ADR-024)', () => {
    const url = new URL(buildRealtimeUrl('https://nexus.example.test', '/v1/auctions/realtime'))

    expect(url.pathname).toBe('/api/v1/auctions/realtime')
    expect(url.search).toBe('')
    expect(url.hash).toBe('')
  })
})
