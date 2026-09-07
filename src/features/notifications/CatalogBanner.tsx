import { useState } from 'react'

import { useActiveBanners } from './useActiveBanners'

/**
 * Banner informativo de la vista principal (HU-38, Task #185).
 *
 * El backend ya entrega SOLO banners vigentes: no se vuelve a comparar
 * `publishAt`/`expiresAt` aqui. 0 entradas no renderiza nada (sin carrusel
 * vacio); 1 entrada no muestra controles; N entradas usan navegacion manual
 * -sin autoplay inventado, ninguna regla define frecuencia de rotacion-.
 */
export const CatalogBanner = (): React.JSX.Element | null => {
  const { items, isLoading, error } = useActiveBanners()
  const [index, setIndex] = useState(0)

  if (isLoading) {
    return null
  }

  if (error !== null) {
    return (
      <p role="alert" className="text-sm text-danger">
        No se pudo cargar el aviso del catálogo.
      </p>
    )
  }

  if (items.length === 0) {
    return null
  }

  const safeIndex = Math.min(index, items.length - 1)
  const current = items[safeIndex]

  if (current === undefined) {
    return null
  }

  const goToPrevious = (): void => {
    setIndex((current) => (current - 1 + items.length) % items.length)
  }

  const goToNext = (): void => {
    setIndex((current) => (current + 1) % items.length)
  }

  return (
    <section
      aria-label="Aviso del catálogo"
      className="rounded-lg border border-brand/30 bg-brand/10 p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-ink">{current.title}</h2>
          <p className="mt-1 text-sm text-ink/90">{current.content}</p>
        </div>

        {items.length > 1 && (
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Banner anterior"
              onClick={goToPrevious}
              className="rounded-md border border-border bg-surface-raised px-2 py-1 text-sm text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              ‹
            </button>
            <span className="text-xs text-muted">
              {safeIndex + 1} / {items.length}
            </span>
            <button
              type="button"
              aria-label="Banner siguiente"
              onClick={goToNext}
              className="rounded-md border border-border bg-surface-raised px-2 py-1 text-sm text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
