import { useEffect, useState } from 'react'

/** Cada momento de la bitacora ocupa este tiempo en pantalla. */
export const BEAT_MS = 900
/** Con mucha cola pendiente se acelera, para no quedarse atras de lo revelado. */
export const FAST_BEAT_MS = 320
const FAST_QUEUE = 6
/** Al entrar con historia ya revelada, solo se reproducen los ultimos momentos. */
export const CATCH_UP_TAIL = 3

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Cuantas entradas de la bitacora lleva reproducidas el diorama.
 *
 * - Hasta el primer paso, la posicion se DERIVA: con historia ya revelada se
 *   arranca al final menos `CATCH_UP_TAIL` momentos, para no repetir una
 *   mision entera al abrir la pantalla.
 * - Despues avanza de una en una, a ritmo fijo, solo desde un temporizador.
 * - En pausa se detiene; con movimiento reducido no anima y muestra siempre el
 *   ultimo estado.
 */
export const useDioramaPlayback = (
  total: number,
  paused: boolean,
): { readonly played: number; readonly reducedMotion: boolean } => {
  const [reducedMotion] = useState(prefersReducedMotion)
  const [stepped, setStepped] = useState<number | null>(null)
  const played = reducedMotion
    ? total
    : (stepped ?? (total > CATCH_UP_TAIL ? total - CATCH_UP_TAIL : 0))

  useEffect(() => {
    if (reducedMotion || paused || played >= total) return
    const timer = window.setTimeout(
      () => {
        setStepped(played + 1)
      },
      total - played > FAST_QUEUE ? FAST_BEAT_MS : BEAT_MS,
    )
    return () => {
      window.clearTimeout(timer)
    }
  }, [played, total, paused, reducedMotion])

  return { played, reducedMotion }
}
