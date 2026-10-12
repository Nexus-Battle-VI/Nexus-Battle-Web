import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  playBattleSfx,
  resetBattleAudioForTests,
  startBattleMusic,
  stopBattleMusic,
} from './battleAudio'
import { useMusicSettings } from './musicStore'
import { initSfx, resetSfxForTests } from './sfxEngine'
import { useSfxSettings } from './sfxStore'

/**
 * Howler falso: jsdom no reproduce audio, asi que sin este doble las pruebas
 * pasarian por construccion. Registra que ficheros se crean y que suena.
 */
const howls = vi.hoisted(
  () =>
    [] as {
      src: string
      playing: boolean
      plays: number
      volume: number
    }[],
)

vi.mock('howler', () => ({
  Howl: class {
    readonly state
    constructor(options: { src: string[]; volume?: number }) {
      this.state = {
        src: options.src[0] ?? '',
        playing: false,
        plays: 0,
        volume: options.volume ?? 1,
      }
      howls.push(this.state)
    }
    play() {
      this.state.playing = true
      this.state.plays += 1
    }
    pause() {
      this.state.playing = false
    }
    stop() {
      this.state.playing = false
    }
    playing() {
      return this.state.playing
    }
    volume() {
      return this.state.volume
    }
    fade(_from: number, to: number) {
      this.state.volume = to
    }
    once(_event: string, callback: () => void) {
      callback()
    }
  },
}))

const gesture = (): void => {
  window.dispatchEvent(new Event('pointerdown'))
}

beforeEach(() => {
  howls.length = 0
  resetSfxForTests()
  resetBattleAudioForTests()
  initSfx()
  useSfxSettings.setState({ enabled: false })
  useMusicSettings.setState({ enabled: true })
})

afterEach(() => {
  resetBattleAudioForTests()
})

describe('audio de batalla con Howler (EN-031)', () => {
  it('con el sonido apagado no crea ni reproduce nada', () => {
    gesture()
    playBattleSfx('attack')
    startBattleMusic()

    expect(howls).toHaveLength(0)
  })

  it('sin gesto de la persona tampoco suena, aunque el sonido este activado', () => {
    useSfxSettings.setState({ enabled: true })
    playBattleSfx('attack')

    expect(howls).toHaveLength(0)
  })

  it('activado y tras un gesto, cada efecto suena desde su fichero', () => {
    useSfxSettings.setState({ enabled: true })
    gesture()

    playBattleSfx('critical')
    playBattleSfx('critical')

    expect(howls).toEqual([
      expect.objectContaining({ src: '/assets/audio/battle/critical.wav', plays: 2 }),
    ])
  })

  it('la musica espera al primer gesto y despues suena en bucle', () => {
    useSfxSettings.setState({ enabled: true })
    startBattleMusic()
    expect(howls).toHaveLength(0)

    gesture()

    expect(howls).toEqual([
      expect.objectContaining({ src: '/assets/audio/battle/battle-theme.wav', playing: true }),
    ])
  })

  it('silenciar la musica la pausa sin tocar los efectos; al terminar se detiene', () => {
    useSfxSettings.setState({ enabled: true })
    gesture()
    startBattleMusic()
    const [music] = howls

    useMusicSettings.getState().setEnabled(false)
    expect(music?.playing).toBe(false)

    useMusicSettings.getState().setEnabled(true)
    expect(music?.playing).toBe(true)

    stopBattleMusic()
    expect(music?.playing).toBe(false)

    // Ya fuera de la batalla, cambiar la preferencia no la vuelve a encender.
    useMusicSettings.getState().setEnabled(false)
    useMusicSettings.getState().setEnabled(true)
    expect(music?.playing).toBe(false)
  })
})
