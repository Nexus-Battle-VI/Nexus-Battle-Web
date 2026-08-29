import * as THREE from 'three'

import { createHeroModel } from './create-hero-model'
import { createHeroScene } from './create-hero-scene'
import type { HeroVisualSpec } from './hero-definitions'

export interface HeroViewHandle {
  readonly dispose: () => void
}

/**
 * Punto donde la biblioteca visual conecta realmente con Three.js
 * (`docs/visual-library/arquitectura-biblioteca-visual.md`, "Relacion con
 * Three.js"). Solo se alcanza mediante `import()` dinamico desde
 * `Hero3D.tsx`, nunca por import estatico: asi Three.js y este modulo quedan
 * en un chunk separado del bundle inicial (ver `docs/visual-library/heroes-3d.md`).
 *
 * Crea el renderer, monta un unico heroe y deja la escena respondiendo al
 * tamaño de `container` mediante `ResizeObserver`. No inicia un loop de
 * animacion: renderiza una vez por cambio de tamaño (`resize()`), porque la
 * escena es estatica (ver "prefers-reduced-motion" en la documentacion).
 *
 * Puede lanzar si el navegador no puede crear un contexto WebGL; quien lo
 * invoque (`Hero3D.tsx`) debe capturarlo y usar el fallback seguro.
 */
export const mountHeroView = (
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  spec: HeroVisualSpec,
): HeroViewHandle => {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2))

  const { scene, camera } = createHeroScene()
  const model = createHeroModel(spec)
  scene.add(model)

  const resize = (): void => {
    const width = container.clientWidth
    const height = container.clientHeight
    if (width === 0 || height === 0) {
      return
    }

    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.render(scene, camera)
  }

  const observer = new ResizeObserver(resize)
  observer.observe(container)
  resize()

  const disposeMesh = (mesh: THREE.Mesh): void => {
    mesh.geometry.dispose()
    const material: THREE.Material | THREE.Material[] = mesh.material
    if (Array.isArray(material)) {
      for (const entry of material) {
        entry.dispose()
      }
    } else {
      material.dispose()
    }
  }

  const dispose = (): void => {
    observer.disconnect()

    model.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        disposeMesh(child as THREE.Mesh)
      }
    })

    renderer.dispose()
  }

  return { dispose }
}
