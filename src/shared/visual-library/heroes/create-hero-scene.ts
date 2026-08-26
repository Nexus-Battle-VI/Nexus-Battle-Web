import * as THREE from 'three'

export interface HeroScene {
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
}

/**
 * Presupuesto vertical (en unidades de escena, con los pies del heroe en
 * y=0) que la camara compartida garantiza mantener visible, con margen.
 *
 * Los ocho heroes (`create-hero-model.ts`, `PROPORTIONS`) miden entre ~3.0 y
 * ~3.6 unidades de pie a punta de cabeza. `HERO_FRAME_HEIGHT` fija el
 * contrato entre proporciones y encuadre: ningun heroe puede superar este
 * valor sin recortarse en camara. Corrige el defecto reportado en revision
 * humana de EN-026.3 (los heroes se veian "casi solo torso + piernas", con
 * la cabeza fuera de cuadro). `create-hero-model.test.ts` verifica que los
 * ocho heroes cumplen este presupuesto midiendo su `THREE.Box3`.
 */
export const HERO_FRAME_HEIGHT = 3.7

const CAMERA_FOV_DEGREES = 35
/** Aire adicional sobre `HERO_FRAME_HEIGHT` para que el heroe mas alto no toque el borde del encuadre. */
const FRAME_MARGIN = 1.1
/** Leve elevacion de la camara sobre el punto de mira, para una perspectiva natural sin distorsionar el encuadre. */
const CAMERA_Y_OFFSET = 0.35

/**
 * Configuracion compartida de escena/camara/iluminacion para cualquier
 * heroe. Se llama una vez por instancia de `Hero3D` montada, nunca una vez
 * por heroe visible simultaneamente en una lista: cada `Hero3D` monta su
 * propia escena minima bajo demanda (ver `mount-hero-view.ts`).
 */
export const createHeroScene = (): HeroScene => {
  const scene = new THREE.Scene()
  // Fondo transparente: el `WebGLRenderer` se crea con `alpha: true`
  // (`mount-hero-view.ts`), asi que la escena se ve sobre el fondo real de
  // Nexus-Battle-Web en vez de imponer un color propio.
  scene.background = null

  const targetY = HERO_FRAME_HEIGHT / 2
  const halfFovRad = THREE.MathUtils.degToRad(CAMERA_FOV_DEGREES / 2)
  const distance = ((HERO_FRAME_HEIGHT / 2) * FRAME_MARGIN) / Math.tan(halfFovRad)

  const camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEGREES, 1, 0.1, 20)
  camera.position.set(0, targetY + CAMERA_Y_OFFSET, distance)
  camera.lookAt(0, targetY, 0)

  const ambient = new THREE.AmbientLight(0xffffff, 0.7)
  const key = new THREE.DirectionalLight(0xffffff, 0.9)
  key.position.set(2, 3, 2)

  scene.add(ambient, key)

  return { scene, camera }
}
