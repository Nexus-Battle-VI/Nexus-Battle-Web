import { fileURLToPath } from 'node:url'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

/**
 * Configuracion de Vitest SOLO para la verificacion manual contra un Auction real (EN-034.5).
 * No la usa `npm test` ni el CI: aquella solo incluye `src/**`.
 *
 * Diferencias con la configuracion normal:
 *  - NO carga `src/test/setup.ts`: ese archivo simula el realtime apagado (ticket 404) y aqui se
 *    quiere el cliente de produccion tal cual.
 *  - jsdom apunta a Caddy (`LIVE_BASE_URL`), para que `buildRealtimeUrl` use su origen.
 *  - El `WebSocket` es el de jsdom, que abre conexiones reales.
 */
const base = process.env.LIVE_BASE_URL ?? 'http://127.0.0.1:18080'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) },
  },
  test: {
    root: fileURLToPath(new URL('../..', import.meta.url)),
    environment: 'jsdom',
    environmentOptions: { jsdom: { url: base } },
    globals: true,
    include: ['scripts/realtime-live/**/*.live.test.tsx'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    setupFiles: ['./scripts/realtime-live/setup.ts'],
  },
})
