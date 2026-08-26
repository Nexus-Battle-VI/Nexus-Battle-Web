import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { createHeroScene } from './create-hero-scene'

/** Pura: Scene/Camera/Light son objetos JS, no requieren WebGL. */
describe('createHeroScene', () => {
  it('crea una escena con fondo transparente y una camara en perspectiva', () => {
    const { scene, camera } = createHeroScene()

    expect(scene).toBeInstanceOf(THREE.Scene)
    expect(scene.background).toBeNull()
    expect(camera).toBeInstanceOf(THREE.PerspectiveCamera)
  })

  it('incluye iluminacion comun (ambiental + direccional)', () => {
    const { scene } = createHeroScene()

    const lightTypes = scene.children.map((child) => child.type)
    expect(lightTypes).toContain('AmbientLight')
    expect(lightTypes).toContain('DirectionalLight')
  })
})
