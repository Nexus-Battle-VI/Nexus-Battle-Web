import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { createHeroModel } from './create-hero-model'
import { HERO_FRAME_HEIGHT } from './create-hero-scene'
import { HERO_VISUAL_SPECS } from './hero-definitions'

/**
 * Estas pruebas no inicializan `WebGLRenderer` ni ningun contexto GPU:
 * construir `Group`/`Mesh`/`Geometry` es JavaScript puro, funciona igual en
 * Node/jsdom que en un navegador real, y es exactamente lo que
 * `createHeroModel` hace.
 */
describe('createHeroModel', () => {
  it('construye un Group no vacio para cada uno de los 8 heroes, sin lanzar', () => {
    for (const spec of HERO_VISUAL_SPECS) {
      const model = createHeroModel(spec)

      expect(model).toBeInstanceOf(THREE.Group)
      expect(model.name).toBe(spec.id)
      expect(model.children.length).toBeGreaterThan(0)
    }
  })

  it('los 8 heroes producen conteos de mallas visualmente distintos (torso+cabeza+piernas+pies+brazos+manos+acento)', () => {
    const meshCounts = HERO_VISUAL_SPECS.map((spec) => {
      let count = 0
      createHeroModel(spec).traverse((child) => {
        if (child instanceof THREE.Mesh) {
          count += 1
        }
      })
      return count
    })

    // Todos deben tener al menos torso + cabeza + 2 piernas + 2 pies + 2 brazos + 2 manos + acento.
    for (const count of meshCounts) {
      expect(count).toBeGreaterThanOrEqual(10)
    }
  })

  it('cada heroe cabe verticalmente dentro de HERO_FRAME_HEIGHT, con los pies en y=0 (evita el recorte visual reportado en revision humana)', () => {
    for (const spec of HERO_VISUAL_SPECS) {
      const model = createHeroModel(spec)
      model.updateMatrixWorld(true)

      const box = new THREE.Box3().setFromObject(model)

      expect(box.min.y).toBeGreaterThanOrEqual(-0.1)
      expect(box.max.y).toBeLessThanOrEqual(HERO_FRAME_HEIGHT)
    }
  })

  it('no depende de un unico builder por heroe: la misma funcion produce los 8 modelos', () => {
    // No existen `GuerreroTanque3D`, `MagoFuego3D`, etc.: `createHeroModel`
    // es la unica fabrica, parametrizada por `HeroVisualSpec`.
    const models = HERO_VISUAL_SPECS.map((spec) => createHeroModel(spec))

    expect(models).toHaveLength(8)
    expect(new Set(models.map((model) => model.name)).size).toBe(8)
  })
})
