import type { ShowcaseProduct } from '@/features/commerce/showcase/api'

/** Datos controlados exclusivamente de pruebas; nunca importados por el producto. */
export const showcaseProduct = (overrides: Partial<ShowcaseProduct> = {}): ShowcaseProduct => ({
  productId: '10000000-0000-4000-8000-000000000001',
  sku: 'espada-de-hierro',
  name: 'Espada de hierro',
  imageUrl: 'https://images.example.test/espada.webp',
  description: 'Forjada para proteger el reino.',
  type: 'ARMA',
  attributes: {
    schemaVersion: '1',
    values: { effects: [{ kind: 'DAMAGE', magnitude: { mode: 'FIXED', amount: 3 } }] },
  },
  printRun: 50,
  printRunMode: 'LIMITED',
  availableUnits: 20,
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 250,
  premium: true,
  realMoneyPrice: { amount: 15000, currency: 'COP' },
  createdAt: '2026-09-03T00:00:00Z',
  updatedAt: '2026-09-03T00:00:00Z',
  version: 1,
  ...overrides,
})
export const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
