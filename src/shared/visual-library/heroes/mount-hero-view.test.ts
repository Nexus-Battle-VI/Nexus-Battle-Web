import { afterEach, describe, expect, it, vi } from 'vitest'

import type * as ThreeModule from 'three'

/**
 * `jsdom` no implementa un `WebGLRenderingContext` real, asi que
 * `THREE.WebGLRenderer` no puede construirse en esta suite (ver
 * `docs/visual-library/heroes-3d.md`, "Three.js en tests"). Se sustituye
 * unicamente `WebGLRenderer` por una version minima que expone la misma
 * superficie (`setPixelRatio`, `setSize`, `render`, `dispose`), sin mockear
 * `Scene`/`Camera`/`Group`/`Mesh` reales. Esto prueba el comportamiento propio
 * de `mountHeroView` (monta, redimensiona, limpia) sin requerir GPU.
 */
vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof ThreeModule>()

  class FakeWebGLRenderer {
    readonly domElement: HTMLCanvasElement
    constructor(params: { readonly canvas: HTMLCanvasElement }) {
      this.domElement = params.canvas
    }
    setPixelRatio = vi.fn()
    setSize = vi.fn()
    render = vi.fn()
    dispose = vi.fn()
  }

  return { ...actual, WebGLRenderer: FakeWebGLRenderer }
})

class StubResizeObserver {
  observe = vi.fn()
  disconnect = vi.fn()
  unobserve = vi.fn()
}

describe('mountHeroView', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('monta, observa el tamaño y limpia sin lanzar, sin un WebGLRenderer real', async () => {
    vi.stubGlobal('ResizeObserver', StubResizeObserver)

    const { mountHeroView } = await import('./mount-hero-view')
    const { HERO_VISUAL_SPECS } = await import('./hero-definitions')
    const spec = HERO_VISUAL_SPECS[0]
    if (!spec) {
      throw new Error('se esperaba al menos una HeroVisualSpec')
    }

    const canvas = document.createElement('canvas')
    const container = document.createElement('div')

    const handle = mountHeroView(canvas, container, spec)

    expect(typeof handle.dispose).toBe('function')
    expect(() => {
      handle.dispose()
    }).not.toThrow()
  })
})
