import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { initSfx, playSfx, resetSfxForTests } from './sfxEngine'
import { SFX_STORAGE_KEY, useSfxSettings } from './sfxStore'

/**
 * `AudioContext` falso: registra cuantos contextos se crean y cuantos
 * osciladores arrancan. jsdom no trae Web Audio, asi que sin este doble el
 * motor no haria nada y las pruebas pasarian por construccion.
 */
const created = { contexts: 0, oscillators: 0 }

const param = (): AudioParam =>
  ({
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }) as unknown as AudioParam

class FakeAudioContext {
  state = 'running'
  currentTime = 0
  destination = {}
  constructor() {
    created.contexts += 1
  }
  resume = vi.fn(() => Promise.resolve())
  createGain() {
    return { gain: param(), connect: vi.fn((node: unknown) => node), disconnect: vi.fn() }
  }
  createOscillator() {
    return {
      type: 'square',
      frequency: param(),
      connect: vi.fn((node: unknown) => node),
      disconnect: vi.fn(),
      onended: null,
      start: vi.fn(() => {
        created.oscillators += 1
      }),
      stop: vi.fn(),
    }
  }
}

const gesture = (): void => {
  window.dispatchEvent(new Event('pointerdown'))
}

beforeEach(() => {
  created.contexts = 0
  created.oscillators = 0
  resetSfxForTests()
  vi.stubGlobal('AudioContext', FakeAudioContext)
  useSfxSettings.setState({ enabled: false })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('motor de efectos de sonido (EN-031)', () => {
  it('apagado por defecto: ni siquiera crea el contexto de audio', () => {
    initSfx()
    gesture()

    playSfx('click')

    expect(created.contexts).toBe(0)
  })

  it('activado pero sin gesto de la persona no suena', () => {
    useSfxSettings.setState({ enabled: true })

    playSfx('click')

    expect(created.contexts).toBe(0)
  })

  it('activado y tras un gesto, suena (control: las demas pruebas no pasan por construccion)', () => {
    useSfxSettings.setState({ enabled: true })
    initSfx()
    gesture()

    playSfx('success')

    expect(created.contexts).toBe(1)
    expect(created.oscillators).toBe(3)
  })

  it('con la pestana oculta no suena', () => {
    useSfxSettings.setState({ enabled: true })
    initSfx()
    gesture()
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)

    playSfx('click')

    expect(created.oscillators).toBe(0)
  })

  it('el mismo efecto no se repite dentro de 60 ms', () => {
    useSfxSettings.setState({ enabled: true })
    initSfx()
    gesture()
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)

    playSfx('click')
    playSfx('click')
    expect(created.oscillators).toBe(1)

    now.mockReturnValue(1100)
    playSfx('click')
    expect(created.oscillators).toBe(2)
  })

  it('si Web Audio falla, la interfaz no se entera', () => {
    useSfxSettings.setState({ enabled: true })
    initSfx()
    gesture()
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'closed'
        constructor() {
          throw new Error('sin audio')
        }
      },
    )

    expect(() => {
      playSfx('error')
    }).not.toThrow()
  })

  it('sin Web Audio en el navegador no hace nada', () => {
    useSfxSettings.setState({ enabled: true })
    initSfx()
    gesture()
    vi.stubGlobal('AudioContext', undefined)

    expect(() => {
      playSfx('click')
    }).not.toThrow()
    expect(created.contexts).toBe(0)
  })
})

describe('preferencia de sonido', () => {
  it('se guarda y alterna', () => {
    useSfxSettings.getState().setEnabled(true)
    expect(localStorage.getItem(SFX_STORAGE_KEY)).toBe('on')

    useSfxSettings.getState().toggle()
    expect(useSfxSettings.getState().enabled).toBe(false)
    expect(localStorage.getItem(SFX_STORAGE_KEY)).toBe('off')
  })
})
