import { PRODUCT_CATALOG } from './product-catalog'
import type { ProductCatalogEntry, ProductCategory } from './product-catalog'
import { ProductVisual2D } from './ProductVisual2D'

/**
 * Harness de verificacion tecnica/humana para EN-026.4 (Task #271).
 *
 * NO es una pantalla del producto: no implementa catalogo, inventario,
 * equipamiento ni E-commerce, no tiene logica de seleccion funcional, no
 * persiste nada y no aparece en `NAVIGATION`. Su unico proposito es permitir
 * inspeccionar juntos los 72/72 productos con el mismo `ProductVisual2D`
 * reutilizable antes del commit. Solo se monta en desarrollo
 * (`import.meta.env.DEV`), ver `src/routes/routes.tsx`.
 */

/** Conteos contractuales por familia (EN-026.1, `docs/visual-library/inventario-heroes-productos.md`). */
const SECTIONS: readonly {
  readonly category: ProductCategory
  readonly title: string
  readonly expectedCount: number
}[] = [
  { category: 'weapon', title: 'ARMAS', expectedCount: 16 },
  { category: 'armor', title: 'ARMADURAS', expectedCount: 16 },
  { category: 'item', title: 'ÍTEMS', expectedCount: 8 },
  { category: 'action', title: 'ACCIONES', expectedCount: 24 },
  { category: 'epic', title: 'ÉPICAS', expectedCount: 8 },
]

const groupByCategory = (category: ProductCategory): readonly ProductCatalogEntry[] =>
  PRODUCT_CATALOG.filter((entry) => entry.category === category)

export const ProductsDevPreview = (): React.JSX.Element => (
  <div className="min-h-dvh bg-surface p-8 text-ink">
    <p className="mb-1 text-xs font-medium tracking-wide text-muted uppercase">
      EN-026.4 · Herramienta de verificación técnica, no una pantalla del producto
    </p>
    <h1 className="mb-6 text-xl font-semibold">
      Recursos visuales de productos ({PRODUCT_CATALOG.length}/72)
    </h1>
    {SECTIONS.map(({ category, title, expectedCount }) => {
      const entries = groupByCategory(category)
      return (
        <section key={category} className="mb-10">
          <h2 className="mb-3 text-sm font-semibold text-muted">
            {title} ({entries.length}/{expectedCount})
          </h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {entries.map((entry) => (
              <li key={entry.id} className="rounded-md border border-border bg-surface-raised p-2">
                <ProductVisual2D resourceId={entry.id} category={entry.category} />
                <p className="mt-1 text-center text-[10px] text-muted">{entry.id}</p>
              </li>
            ))}
          </ul>
        </section>
      )
    })}
  </div>
)
