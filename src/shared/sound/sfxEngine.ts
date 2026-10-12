import { useSfxSettings } from './sfxStore'

/**
 * Efectos de sonido 8-bit sintetizados con Web Audio (EN-031): sin ficheros
 * de audio, sin dependencias y sin licencias que registrar.
 *
 * Reglas que esta funcion garantiza, en este orden:
 * 1. Apagado por defecto: si la persona no lo activo, no se crea nada.
 * 2. Nunca sin un gesto de la persona (clic o tecla): ni aunque quedara
 *    activado de una sesion anterior.
 * 3. Nunca con la pestana oculta.
 * 4. Nunca rompe ni bloquea la interfaz: cualquier fallo se ignora.
 */
export type SfxName = 'click' | 'menuOpen' | 'menuClose' | 'success' | 'error' | 'notification'

interface Note {
  readonly freq: number
  readonly start: number
  readonly dur: number
  readonly type: OscillatorType
  readonly slideTo?: number
  readonly level?: number
}

const RECIPES: Readonly<Record<SfxName, readonly Note[]>> = {
  click: [{ freq: 880, start: 0, dur: 0.04, type: 'square', level: 0.6 }],
  menuOpen: [
    { freq: 440, start: 0, dur: 0.06, type: 'square', slideTo: 660 },
    { freq: 660, start: 0.05, dur: 0.07, type: 'square' },
  ],
  menuClose: [{ freq: 660, start: 0, dur: 0.07, type: 'square', slideTo: 440 }],
  success: [
    { freq: 523.25, start: 0, dur: 0.08, type: 'square' },
    { freq: 659.25, start: 0.08, dur: 0.08, type: 'square' },
    { freq: 783.99, start: 0.16, dur: 0.12, type: 'triangle' },
  ],
  error: [
    { freq: 220, start: 0, dur: 0.12, type: 'square', slideTo: 150 },
    { freq: 147, start: 0.12, dur: 0.12, type: 'square' },
  ],
  notification: [
    { freq: 987.77, start: 0, dur: 0.07, type: 'triangle' },
    { freq: 1318.51, start: 0.08, dur: 0.12, type: 'triangle' },
  ],
}

/** Volumen maestro: suave, para acompanar y no sobresaltar. */
const MASTER = 0.12
/** Un mismo efecto no se repite mas de una vez en este intervalo. */
const THROTTLE_MS = 60

let context: AudioContext | null = null
let gestured = false
const lastPlayed = new Map<SfxName, number>()

/**
 * Escucha el PRIMER gesto de la persona (captura, pasivo, una sola vez). Se
 * llama desde `main.tsx`; sin el, solo vale `navigator.userActivation`.
 */
export const initSfx = (): void => {
  if (typeof window === 'undefined') return
  const onGesture = (): void => {
    gestured = true
    window.removeEventListener('pointerdown', onGesture, true)
    window.removeEventListener('keydown', onGesture, true)
  }
  window.addEventListener('pointerdown', onGesture, { capture: true, passive: true })
  window.addEventListener('keydown', onGesture, { capture: true, passive: true })
}

// Los tipos del DOM dan estas APIs por presentes; jsdom y navegadores viejos
// no las tienen, asi que se leen como opcionales.
const maybe = globalThis as Partial<typeof globalThis>

const hasGesture = (): boolean =>
  gestured ||
  (maybe.navigator as Partial<Navigator> | undefined)?.userActivation?.hasBeenActive === true

/**
 * Las mismas tres primeras reglas de arriba, para quien reproduce audio por su
 * cuenta (la musica y los efectos de batalla con Howler, `battleAudio.ts`).
 */
export const canPlaySound = (): boolean =>
  useSfxSettings.getState().enabled &&
  !(typeof document !== 'undefined' && document.hidden) &&
  hasGesture()

const audioContextConstructor = (): (new () => AudioContext) | undefined => maybe.AudioContext

export const playSfx = (name: SfxName): void => {
  try {
    if (!useSfxSettings.getState().enabled) return
    if (typeof document !== 'undefined' && document.hidden) return
    if (!hasGesture()) return
    const AudioContextCtor = audioContextConstructor()
    if (AudioContextCtor === undefined) return

    const now = performance.now()
    const previous = lastPlayed.get(name)
    if (previous !== undefined && now - previous < THROTTLE_MS) return
    lastPlayed.set(name, now)

    context ??= new AudioContextCtor()
    const audio = context
    if (audio.state === 'suspended') {
      void audio.resume().catch(() => undefined)
    }

    const t0 = audio.currentTime
    for (const note of RECIPES[name]) {
      const oscillator = audio.createOscillator()
      const gain = audio.createGain()
      const start = t0 + note.start
      const end = start + note.dur
      oscillator.type = note.type
      oscillator.frequency.setValueAtTime(note.freq, start)
      if (note.slideTo !== undefined)
        oscillator.frequency.linearRampToValueAtTime(note.slideTo, end)
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.linearRampToValueAtTime(MASTER * (note.level ?? 1), start + 0.005)
      gain.gain.exponentialRampToValueAtTime(0.0001, end)
      oscillator.connect(gain).connect(audio.destination)
      oscillator.onended = () => {
        oscillator.disconnect()
        gain.disconnect()
      }
      oscillator.start(start)
      oscillator.stop(end + 0.02)
    }
  } catch {
    // El sonido es decorativo: un fallo de Web Audio nunca rompe la interfaz.
  }
}

/** Solo para pruebas: vuelve al estado de arranque. */
export const resetSfxForTests = (): void => {
  context = null
  gestured = false
  lastPlayed.clear()
}
