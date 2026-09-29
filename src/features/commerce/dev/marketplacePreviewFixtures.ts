import type { ShowcaseProduct } from '@/features/commerce/showcase/api'

/**
 * Datos ficticios EXCLUSIVOS del harness de desarrollo `MarketplacePreviewPage`
 * (4a pasada del remaster visual E-commerce, Sprint 3). Nunca se importan
 * desde una pantalla productiva: sirven solo para inspeccionar visualmente
 * `ShowcaseGrid`/`ProductDetail` -los componentes REALES- cuando el catálogo
 * local de Catalog está vacío (no hay backend detrás de este archivo).
 *
 * Cubren, como pide el checklist de la 4a pasada: héroe, arma, armadura,
 * habilidad, deseado/no deseado, premium/rareza, agotado/suspendido, y las
 * dos formas de precio (solo créditos vs. créditos + dinero real).
 */
const base: ShowcaseProduct = {
  productId: 'preview-0000-0000-0000-000000000000',
  sku: 'preview-base',
  name: 'Producto de vista previa',
  imageUrl: 'https://images.example.test/preview.webp',
  description: 'Ficha de ejemplo para inspeccionar el marco de la card.',
  type: 'ITEM',
  attributes: { schemaVersion: '1', values: {} },
  printRun: -1,
  printRunMode: 'INFINITE',
  availableUnits: null,
  lifecycleStatus: 'ACTIVE',
  creditsPrice: 100,
  premium: true,
  realMoneyPrice: null,
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  version: 1,
}

const product = (overrides: Partial<ShowcaseProduct>): ShowcaseProduct => ({ ...base, ...overrides })

export const MARKETPLACE_PREVIEW_PRODUCTS: readonly ShowcaseProduct[] = [
  product({
    productId: 'preview-hero-0001',
    sku: 'preview-heroe-guerrero',
    name: 'Guerrero Tanque',
    description: 'Héroe de línea frontal con alta resistencia.',
    type: 'HEROE',
    printRunMode: 'UNIQUE',
    printRun: 1,
    availableUnits: 1,
    creditsPrice: 500,
    realMoneyPrice: { amount: 25000, currency: 'COP' },
  }),
  product({
    productId: 'preview-weapon-0002',
    sku: 'preview-espada-hierro',
    name: 'Espada de hierro',
    description: 'Arma cuerpo a cuerpo forjada para el combate.',
    type: 'ARMA',
    printRunMode: 'LIMITED',
    printRun: 50,
    availableUnits: 12,
    creditsPrice: 250,
    realMoneyPrice: { amount: 15000, currency: 'COP' },
  }),
  product({
    productId: 'preview-armor-0003',
    sku: 'preview-armadura-placas',
    name: 'Armadura de placas',
    description: 'Protección pesada para el frente de batalla.',
    type: 'ARMADURA',
    printRunMode: 'LIMITED',
    printRun: 30,
    availableUnits: 8,
    creditsPrice: 300,
    realMoneyPrice: { amount: 18000, currency: 'COP' },
  }),
  product({
    productId: 'preview-ability-0004',
    sku: 'preview-habilidad-furia',
    name: 'Furia arcana',
    description: 'Habilidad ofensiva de área.',
    type: 'HABILIDAD',
    printRunMode: 'INFINITE',
    printRun: -1,
    availableUnits: null,
    creditsPrice: 150,
    realMoneyPrice: { amount: 9000, currency: 'USD' },
  }),
  product({
    productId: 'preview-rare-0005',
    sku: 'preview-yelmo-antiguo',
    name: 'Yelmo antiguo',
    description: 'Pieza única de una edición pasada.',
    type: 'ARMADURA',
    printRunMode: 'UNIQUE',
    printRun: 1,
    availableUnits: 1,
    creditsPrice: 800,
    realMoneyPrice: { amount: 40000, currency: 'COP' },
  }),
  product({
    productId: 'preview-soldout-0006',
    sku: 'preview-arco-agotado',
    name: 'Arco corto agotado',
    description: 'Ejemplo de producto sin unidades disponibles.',
    type: 'ARMA',
    printRunMode: 'LIMITED',
    printRun: 10,
    availableUnits: 0,
    creditsPrice: 200,
    realMoneyPrice: { amount: 12000, currency: 'COP' },
  }),
  product({
    productId: 'preview-suspended-0007',
    sku: 'preview-arma-suspendida',
    name: 'Arma suspendida',
    description: 'Ejemplo de producto temporalmente suspendido.',
    type: 'ARMA',
    lifecycleStatus: 'SUSPENDED',
    creditsPrice: 220,
    realMoneyPrice: { amount: 13000, currency: 'COP' },
  }),
  product({
    productId: 'preview-usd-0008',
    sku: 'preview-habilidad-usd',
    name: 'Escudo de hielo',
    description: 'Ejemplo de precio publicado en USD.',
    type: 'HABILIDAD',
    creditsPrice: 180,
    realMoneyPrice: { amount: 500, currency: 'USD' },
  }),
] as const
