import { useEffect, useState } from 'react'

/**
 * Retrasa la propagacion de un valor.
 *
 * Se usa para que teclear en un filtro no dispare una consulta por pulsacion.
 * El temporizador se limpia en cada cambio, de modo que solo el ultimo valor
 * sobrevive al retraso.
 */
export const useDebouncedValue = <T>(value: T, delayMs = 300): T => {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value)
    }, delayMs)

    return () => {
      clearTimeout(timer)
    }
  }, [value, delayMs])

  return debounced
}
