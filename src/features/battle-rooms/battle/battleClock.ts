/**
 * Reloj de VISUALIZACION (HU-21, contrato §6.4). Es el unico modulo autorizado a
 * leer el tiempo local para mostrar, y NUNCA es autoridad: llegar a 0 en pantalla
 * no ejecuta nada; quien cierra la batalla o el turno es Combat.
 *
 * No usa `Date.now()` ni `new Date(` (guardas existentes): lee el instante del
 * servidor de `resume.ok.serverTime` y avanza con un reloj MONOTONO
 * (`performance.now()`, inyectable en pruebas). Este archivo NO conoce Vida,
 * dano, ataque, Poder ni ganador: solo tiempos.
 */
export interface ServerClock {
  /** Instante del servidor (ms) en el momento de la sincronizacion. */
  readonly serverAtSyncMs: number
  /** Lectura del reloj monotono local en ese mismo momento. */
  readonly monotonicAtSyncMs: number
}

/**
 * Lectura del reloj MONOTONO local. Es el unico punto que toca `performance.now()`;
 * el resto del modulo lo recibe como parametro, y las pruebas lo inyectan.
 */
export const monotonicNow = (): number => performance.now()

/** Crea el reloj a partir del `serverTime` ISO; `null` si el instante no es valido. */
export const createServerClock = (
  serverTimeIso: string,
  monotonicNowMs: number,
): ServerClock | null => {
  const serverAtSyncMs = Date.parse(serverTimeIso)

  if (Number.isNaN(serverAtSyncMs)) {
    return null
  }

  return { serverAtSyncMs, monotonicAtSyncMs: monotonicNowMs }
}

/**
 * Milisegundos que faltan para `deadlineIso` segun el reloj del servidor
 * proyectado con el monotono local. Nunca negativo.
 */
export const remainingMs = (
  deadlineIso: string,
  clock: ServerClock,
  monotonicNowMs: number,
): number => {
  const deadlineMs = Date.parse(deadlineIso)

  if (Number.isNaN(deadlineMs)) {
    return 0
  }

  const elapsed = monotonicNowMs - clock.monotonicAtSyncMs

  return Math.max(0, deadlineMs - (clock.serverAtSyncMs + elapsed))
}

/** «0:24», «5:59»: minutos sin relleno y segundos con dos digitos, redondeando hacia arriba. */
export const formatRemaining = (ms: number): string => {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}

/** Umbrales fijos, solo presentacion: `low` a 10 s o menos, `critical` a 5 s o menos. */
export const timeWarning = (ms: number): 'none' | 'low' | 'critical' => {
  if (ms <= 5_000) {
    return 'critical'
  }

  return ms <= 10_000 ? 'low' : 'none'
}
