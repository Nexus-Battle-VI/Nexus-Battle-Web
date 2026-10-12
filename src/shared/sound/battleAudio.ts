import { Howl } from 'howler'

import { useMusicSettings } from './musicStore'
import { canPlaySound } from './sfxEngine'
import { useSfxSettings } from './sfxStore'

/**
 * Musica y efectos de la batalla de Jugar Online (EN-031), reproducidos con
 * Howler. Los ficheros los compone `scripts/compose-battle-audio.mjs`: musica
 * original, sin licencias de terceros.
 *
 * Mismas reglas que `sfxEngine.ts`: nada suena si la persona no activo el
 * sonido, antes de su primer gesto ni con la pestana oculta, y ningun fallo de
 * audio rompe la pantalla. La musica, ademas, respeta su propia preferencia
 * (`useMusicSettings`) y se pausa sola al ocultar la pestana.
 *
 * Solo presentacion: lo que dispara cada efecto es un evento que Combat ya
 * publico; el audio nunca decide nada del combate.
 */
export type BattleSfxName =
  'attack' | 'critical' | 'block' | 'skill' | 'heal' | 'epic' | 'turn' | 'victory' | 'defeat'

const BASE = '/assets/audio/battle'
const MUSIC_VOLUME = 0.3
const SFX_VOLUME = 0.6
const FADE_MS = 700

const sfx = new Map<BattleSfxName, Howl>()
let music: Howl | null = null
let wanted = false
let unsubscribe: (() => void) | null = null

const effect = (name: BattleSfxName): Howl => {
  const existing = sfx.get(name)
  if (existing !== undefined) return existing
  const created = new Howl({ src: [`${BASE}/${name}.wav`], volume: SFX_VOLUME, preload: true })
  sfx.set(name, created)
  return created
}

export const playBattleSfx = (name: BattleSfxName): void => {
  try {
    if (!canPlaySound()) return
    effect(name).play()
  } catch {
    // El sonido es decorativo: un fallo nunca rompe la interfaz.
  }
}

const shouldPlayMusic = (): boolean =>
  wanted && useMusicSettings.getState().enabled && canPlaySound()

/** Arranca, reanuda o pausa la musica segun las preferencias y la pestana. */
const syncMusic = (): void => {
  try {
    if (shouldPlayMusic()) {
      music ??= new Howl({
        src: [`${BASE}/battle-theme.wav`],
        loop: true,
        volume: 0,
        preload: true,
      })
      if (!music.playing()) {
        music.play()
        music.fade(0, MUSIC_VOLUME, FADE_MS)
      }
    } else if (music?.playing() === true) {
      music.pause()
    }
  } catch {
    // Igual que los efectos: decorativo.
  }
}

/**
 * La pantalla de batalla la pide al montarse. Si aun no hubo gesto o el sonido
 * esta apagado, queda a la espera y empieza en cuanto se cumpla.
 */
export const startBattleMusic = (): void => {
  wanted = true
  if (unsubscribe === null && typeof window !== 'undefined') {
    const onChange = (): void => {
      syncMusic()
    }
    const stopSfx = useSfxSettings.subscribe(onChange)
    const stopMusic = useMusicSettings.subscribe(onChange)
    document.addEventListener('visibilitychange', onChange)
    window.addEventListener('pointerdown', onChange, { capture: true, passive: true })
    window.addEventListener('keydown', onChange, { capture: true, passive: true })
    unsubscribe = () => {
      stopSfx()
      stopMusic()
      document.removeEventListener('visibilitychange', onChange)
      window.removeEventListener('pointerdown', onChange, true)
      window.removeEventListener('keydown', onChange, true)
    }
  }
  syncMusic()
}

/** Al terminar la batalla o salir de la pantalla: la musica se apaga con un fundido. */
export const stopBattleMusic = (): void => {
  wanted = false
  unsubscribe?.()
  unsubscribe = null
  const current = music
  if (current === null) return
  try {
    if (current.playing()) {
      current.once('fade', () => {
        current.stop()
      })
      current.fade(current.volume(), 0, FADE_MS)
    } else {
      current.stop()
    }
  } catch {
    // Decorativo.
  }
}

/** Solo para pruebas: vuelve al estado de arranque. */
export const resetBattleAudioForTests = (): void => {
  unsubscribe?.()
  unsubscribe = null
  wanted = false
  music = null
  sfx.clear()
}
