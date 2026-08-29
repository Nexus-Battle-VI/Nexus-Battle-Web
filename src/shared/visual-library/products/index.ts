/**
 * Punto unico de consumo publico de los productos 2D (EN-026.4).
 *
 * No reexporta `render-product-visual.tsx` ni `ProductsDevPreview.tsx`: el
 * primero es un detalle interno de `ProductVisual2D`, el segundo es un
 * harness dev-only que ya se carga mediante `import()` dinamico desde
 * `src/routes/ProductsDevPreviewLazy.tsx`.
 */
export { PRODUCT_CATALOG, PRODUCT_CATALOG_BY_ID } from './product-catalog'
export type { ArmorSlot, ProductCatalogEntry, ProductCategory } from './product-catalog'

export { PRODUCT_VISUAL_SPECS, PRODUCT_VISUAL_SPECS_BY_ID } from './product-visual-definitions'
export type { ProductVisualSpec } from './product-visual-definitions'

export { ProductVisual2D } from './ProductVisual2D'
export type { ProductVisual2DProps } from './ProductVisual2D'
