import { useEffect, useSyncExternalStore } from 'react'

/**
 * Cuentas regresivas de la interfaz. El servidor dice cuánto falta; aquí solo se
 * descuenta el tiempo que pasó desde que llegó la respuesta, para que el número
 * baje cada segundo sin volver a preguntar. Vive fuera de las features porque usa
 * el reloj, y las guardas de algunas features (Misiones, HU-09.5) lo prohíben: allí
 * el reloj nunca decide nada, solo se muestra.
 */

const SECOND_MS = 1000

/** Segundos que quedan: los del servidor menos los que pasaron desde `receivedAt`. */
export const remainingAt = (remainingSeconds: number, receivedAt: number, now: number): number =>
  Math.max(0, remainingSeconds - Math.floor(Math.max(0, now - receivedAt) / SECOND_MS))

// Un solo reloj para toda la aplicación: avanza cada segundo mientras alguien lo mira.
const listeners = new Set<() => void>()
let timer: number | null = null
let current = Date.now()

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  if (timer === null) {
    current = Date.now()
    timer = window.setInterval(() => {
      current = Date.now()
      for (const notify of listeners) notify()
    }, SECOND_MS)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer !== null) {
      window.clearInterval(timer)
      timer = null
    }
  }
}

const snapshot = (): number => current

/** La hora actual, que cambia una vez por segundo. */
export const useNow = (): number => useSyncExternalStore(subscribe, snapshot, snapshot)

/**
 * La cuenta regresiva viva de una respuesta del servidor. `receivedAt` es cuando
 * llegó (p. ej. `dataUpdatedAt` de TanStack Query). `null` si no hay cuenta.
 */
export const useCountdown = (
  remainingSeconds: number | null,
  receivedAt: number,
): number | null => {
  const now = useNow()
  return remainingSeconds === null ? null : remainingAt(remainingSeconds, receivedAt, now)
}

/** «2 h 05 min», «9:58» o «0:00». */
export const countdownLabel = (seconds: number): string => {
  const whole = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(whole / 3600)
  const minutes = Math.floor((whole % 3600) / 60)
  const rest = whole % 60
  if (hours > 0) return `${String(hours)} h ${String(minutes).padStart(2, '0')} min`
  return `${String(minutes)}:${String(rest).padStart(2, '0')}`
}

/** Milisegundos hasta `iso`, acotados entre `min` y `max`; `null` si no hay fecha. */
export const delayUntil = (
  iso: string | null,
  now: number,
  min = SECOND_MS,
  max = 60 * SECOND_MS,
): number | null => {
  if (iso === null) return null
  const at = Date.parse(iso)
  if (Number.isNaN(at)) return null
  return Math.min(max, Math.max(min, at - now))
}

/**
 * Llama a `callback` cuando llega `iso` (entre 1 s y 60 s después). Sirve para
 * pedir al servidor lo siguiente justo cuando lo va a revelar, sin sondear.
 */
export const useCallAt = (iso: string | null, callback: () => void): void => {
  useEffect(() => {
    const delay = delayUntil(iso, Date.now())
    if (delay === null) return undefined
    const pending = window.setTimeout(callback, delay)
    return () => {
      window.clearTimeout(pending)
    }
  }, [iso, callback])
}
