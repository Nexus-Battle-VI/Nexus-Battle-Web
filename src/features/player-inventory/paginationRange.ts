/** RF-27: la interfaz muestra como maximo 10 numeros de pagina a la vez. */
export const MAX_VISIBLE_PAGES = 10

/**
 * Ventana de hasta 10 numeros de pagina centrada en la actual. Fuera de la
 * ventana se navega con las flechas anterior/siguiente.
 */
export const visiblePages = (page: number, totalPages: number): readonly number[] => {
  if (totalPages <= 0) {
    return []
  }

  const count = Math.min(MAX_VISIBLE_PAGES, totalPages)
  let start = page - Math.floor(count / 2)
  start = Math.max(1, Math.min(start, totalPages - count + 1))

  return Array.from({ length: count }, (_, index) => start + index)
}
