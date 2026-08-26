import * as THREE from 'three'

import type {
  HeroAccent,
  HeroDetailPlacement,
  HeroDetailSpec,
  HeroVisualSpec,
  HeroSilhouette,
} from './hero-definitions'

/**
 * Proporciones de pierna/torso/cabeza por arquetipo de silueta. Son la unica
 * fuente de la diferencia de forma entre heroes: ningun heroe muestra su
 * arma, armadura ni item para distinguirse (regla de EN-026, ver
 * `docs/visual-library/heroes-3d.md`).
 *
 * La altura total de cada heroe (`legLength + torso.height + 2*headRadius`,
 * con los pies en y=0) se mantiene deliberadamente por debajo de
 * `HERO_FRAME_HEIGHT` (`create-hero-scene.ts`): ese es el contrato que evita
 * el recorte visual reportado en revision humana (los heroes se veian "casi
 * solo torso + piernas"). Ver `create-hero-model.test.ts`.
 */
const PROPORTIONS: Readonly<
  Record<
    HeroSilhouette,
    {
      readonly torso: readonly [number, number, number]
      readonly legLength: number
      readonly headRadius: number
    }
  >
> = {
  bulky: { torso: [1.3, 1.05, 0.85], legLength: 1.05, headRadius: 0.48 },
  balanced: { torso: [0.95, 1.2, 0.6], legLength: 1.25, headRadius: 0.44 },
  slender: { torso: [0.68, 1.3, 0.48], legLength: 1.45, headRadius: 0.4 },
}

/**
 * Acento geometrico abstracto (ver `HeroAccent`). Cada rama construye una
 * unica malla u objeto pequeño, sin geometrias costosas. `mesh.position` se
 * expresa relativo al torso; `createHeroModel` desplaza el resultado hasta
 * la altura real del torso de cada heroe.
 */
const buildAccent = (accent: HeroAccent, color: string): THREE.Object3D => {
  const material = new THREE.MeshStandardMaterial({ color })

  switch (accent) {
    case 'shoulderBlock': {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.3, 0.95), material)
      mesh.position.set(0, 0, 0)
      return mesh
    }
    case 'crest': {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.19, 0.75, 4), material)
      mesh.position.set(0, 0.9, -0.15)
      mesh.rotation.x = Math.PI * 0.1
      return mesh
    }
    case 'flame': {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.6, 12), material)
      mesh.position.set(0, 1.05, 0)
      return mesh
    }
    case 'crystal': {
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.26, 0), material)
      mesh.position.set(0, 1.05, 0)
      return mesh
    }
    case 'hood': {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.6, 8), material)
      mesh.position.set(0, 0.9, 0)
      return mesh
    }
    case 'band': {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.07, 8, 24), material)
      mesh.rotation.x = Math.PI / 2
      mesh.position.set(0, -0.15, 0)
      return mesh
    }
    case 'antlers': {
      const group = new THREE.Group()
      const geometry = new THREE.ConeGeometry(0.06, 0.58, 6)

      const left = new THREE.Mesh(geometry, material)
      left.position.set(-0.22, 1.1, 0)
      left.rotation.z = Math.PI * 0.18

      const right = new THREE.Mesh(geometry, material)
      right.position.set(0.22, 1.1, 0)
      right.rotation.z = -Math.PI * 0.18

      group.add(left, right)
      return group
    }
    case 'halo': {
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 8, 24), material)
      mesh.rotation.x = Math.PI / 2
      mesh.position.set(0, 1.2, 0)
      return mesh
    }
  }
}

/** Medidas ya calculadas del cuerpo de un heroe, para anclar su `HeroDetailSpec`. */
interface HeroDetailContext {
  readonly torsoY: number
  readonly torsoWidth: number
  readonly torsoHeight: number
  readonly torsoDepth: number
  readonly headRadius: number
  readonly headCenterY: number
  /** Magnitud (positiva) del desplazamiento lateral de un brazo respecto al centro. */
  readonly armX: number
  readonly armLength: number
  /** Y absoluta del centro de la mano (extremo inferior del brazo). */
  readonly handY: number
}

/** `handLeft` usa el lado izquierdo; cualquier otro placement usa el derecho por defecto. */
const resolveHandX = (placement: HeroDetailPlacement, armX: number): number =>
  placement === 'handLeft' ? -armX : armX

/**
 * Construye el rasgo visual distintivo de un heroe (`HeroDetailSpec`). Es el
 * unico lugar que traduce `HeroDetailType` a geometria: agregar un heroe
 * futuro que reutilice un tipo existente (como `blade`) no requiere
 * duplicar esta funcion, solo una nueva entrada de datos en
 * `hero-definitions.ts`.
 */
const buildHeroDetail = (detail: HeroDetailSpec, ctx: HeroDetailContext): THREE.Object3D => {
  const scale = detail.scale ?? 1
  const material = new THREE.MeshStandardMaterial({ color: detail.color })

  switch (detail.type) {
    case 'helmet': {
      const size = ctx.headRadius * 1.6 * scale
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, ctx.headRadius * 0.7 * scale, size),
        material,
      )
      mesh.position.set(0, ctx.headCenterY + ctx.headRadius * 0.85, 0)
      return mesh
    }
    case 'blade': {
      const bladeLength = 0.55 * scale
      const bladeWidth = 0.09 * scale
      const handX = resolveHandX(detail.placement, ctx.armX)
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(bladeWidth, bladeLength, bladeWidth * 0.6),
        material,
      )
      mesh.position.set(handX, ctx.handY + bladeLength / 2, ctx.torsoDepth * 0.15)
      mesh.rotation.z = handX < 0 ? Math.PI * 0.06 : -Math.PI * 0.06
      return mesh
    }
    case 'flameWisp': {
      const handX = resolveHandX(detail.placement, ctx.armX)
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 0.28 * scale, 8), material)
      mesh.position.set(handX, ctx.handY + 0.22, 0)
      return mesh
    }
    case 'iceShard': {
      const handX = resolveHandX(detail.placement, ctx.armX)
      const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.15 * scale, 0), material)
      mesh.position.set(handX, ctx.handY + 0.2, 0)
      return mesh
    }
    case 'serpentCoil': {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.22 * scale, 0.045, 8, 16, Math.PI * 1.5),
        material,
      )
      mesh.position.set(
        ctx.torsoWidth / 2 + 0.06,
        ctx.torsoY - ctx.torsoHeight * 0.15,
        ctx.torsoDepth * 0.2,
      )
      mesh.rotation.y = Math.PI / 2
      return mesh
    }
    case 'ritualCrown': {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(ctx.headRadius * 0.95 * scale, 0.035, 8, 20),
        material,
      )
      mesh.rotation.x = Math.PI / 2
      mesh.position.set(0, ctx.headCenterY + ctx.headRadius * 0.75, 0)
      return mesh
    }
    case 'medicalCross': {
      const group = new THREE.Group()
      const vertical = new THREE.Mesh(
        new THREE.BoxGeometry(0.08 * scale, 0.3 * scale, 0.04),
        material,
      )
      const horizontal = new THREE.Mesh(
        new THREE.BoxGeometry(0.3 * scale, 0.08 * scale, 0.04),
        material,
      )
      group.add(vertical, horizontal)
      group.position.set(0, ctx.torsoY + ctx.torsoHeight * 0.15, ctx.torsoDepth / 2 + 0.03)
      return group
    }
    case 'chestWeaponMark': {
      const group = new THREE.Group()
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.06 * scale, 0.26 * scale, 0.03),
        material,
      )
      const guard = new THREE.Mesh(
        new THREE.BoxGeometry(0.16 * scale, 0.04 * scale, 0.03),
        material,
      )
      guard.position.y = -0.1 * scale
      group.add(blade, guard)
      group.position.set(0, ctx.torsoY + ctx.torsoHeight * 0.15, ctx.torsoDepth / 2 + 0.03)
      return group
    }
    case 'chestMacheteMark': {
      // Variante distinta de `chestWeaponMark`: una unica hoja corta e
      // inclinada, sin guarda, para que Pícaro Machete no luzca identico a
      // Guerrero Armas en el pecho.
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.07 * scale, 0.22 * scale, 0.03), material)
      mesh.rotation.z = Math.PI * 0.14
      mesh.position.set(0, ctx.torsoY + ctx.torsoHeight * 0.15, ctx.torsoDepth / 2 + 0.03)
      return mesh
    }
    case 'chestFireMark': {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.09 * scale, 0.2 * scale, 8), material)
      mesh.position.set(0, ctx.torsoY + ctx.torsoHeight * 0.15, ctx.torsoDepth / 2 + 0.03)
      return mesh
    }
    case 'chestIceMark': {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.16 * scale, 0.16 * scale, 0.16 * scale),
        material,
      )
      mesh.rotation.set(Math.PI / 4, Math.PI / 4, 0)
      mesh.position.set(0, ctx.torsoY + ctx.torsoHeight * 0.15, ctx.torsoDepth / 2 + 0.04)
      return mesh
    }
    case 'chestPoisonMark': {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09 * scale, 8, 8), material)
      mesh.scale.set(0.8, 1.3, 0.8)
      mesh.position.set(0, ctx.torsoY + ctx.torsoHeight * 0.15, ctx.torsoDepth / 2 + 0.03)
      return mesh
    }
    case 'chestMagicStars': {
      const group = new THREE.Group()
      const starGeometry = new THREE.TetrahedronGeometry(0.06 * scale, 0)
      const offsets: readonly (readonly [number, number])[] = [
        [-0.12, 0.06],
        [0.12, 0.02],
        [0, -0.1],
      ]
      for (const [dx, dy] of offsets) {
        const star = new THREE.Mesh(starGeometry, material)
        star.position.set(dx, dy, 0)
        group.add(star)
      }
      group.position.set(0, ctx.torsoY + ctx.torsoHeight * 0.15, ctx.torsoDepth / 2 + 0.04)
      return group
    }
  }
}

/**
 * Construye el modelo 3D de un heroe a partir de su `HeroVisualSpec`,
 * combinando primitivas de Three.js: cabeza, torso, dos piernas con pies,
 * dos brazos con manos, y un acento. Es deliberadamente simple y no requiere
 * WebGL: crear geometrias, materiales y `Object3D` funciona igual en
 * Node/jsdom que en un navegador con GPU, lo que permite probar esta funcion
 * sin un `WebGLRenderer` real.
 */
export const createHeroModel = (spec: HeroVisualSpec): THREE.Group => {
  const { torso, legLength, headRadius } = PROPORTIONS[spec.silhouette]
  const [torsoWidth, torsoHeight, torsoDepth] = torso
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: spec.bodyColor })

  const group = new THREE.Group()
  group.name = spec.id

  const torsoY = legLength + torsoHeight / 2

  const torsoMesh = new THREE.Mesh(
    new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth),
    bodyMaterial,
  )
  torsoMesh.position.set(0, torsoY, 0)
  group.add(torsoMesh)

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(headRadius, 16, 16), bodyMaterial)
  headMesh.position.set(0, torsoY + torsoHeight / 2 + headRadius, 0)
  group.add(headMesh)

  const legRadius = torsoWidth * 0.18
  const legGeometry = new THREE.CylinderGeometry(legRadius, legRadius, legLength, 8)
  const footGeometry = new THREE.BoxGeometry(legRadius * 2.2, legRadius * 0.8, torsoDepth * 0.55)
  for (const side of [-1, 1]) {
    const legX = side * torsoWidth * 0.25

    const leg = new THREE.Mesh(legGeometry, bodyMaterial)
    leg.position.set(legX, legLength / 2, 0)
    group.add(leg)

    const foot = new THREE.Mesh(footGeometry, bodyMaterial)
    foot.position.set(legX, legRadius * 0.4, torsoDepth * 0.12)
    group.add(foot)
  }

  const armRadius = torsoWidth * 0.13
  const armLength = torsoHeight * 0.95
  const armGeometry = new THREE.CylinderGeometry(armRadius, armRadius, armLength, 8)
  const handGeometry = new THREE.SphereGeometry(armRadius * 1.2, 8, 8)
  for (const side of [-1, 1]) {
    const armX = side * (torsoWidth / 2 + torsoWidth * 0.16)

    const arm = new THREE.Mesh(armGeometry, bodyMaterial)
    arm.position.set(armX, torsoY, 0)
    group.add(arm)

    const hand = new THREE.Mesh(handGeometry, bodyMaterial)
    hand.position.set(armX, torsoY - armLength / 2, 0)
    group.add(hand)
  }

  const accent = buildAccent(spec.accent, spec.accentColor)
  accent.position.y += torsoY
  group.add(accent)

  const detailContext: HeroDetailContext = {
    torsoY,
    torsoWidth,
    torsoHeight,
    torsoDepth,
    headRadius,
    headCenterY: torsoY + torsoHeight / 2 + headRadius,
    armX: torsoWidth / 2 + torsoWidth * 0.16,
    armLength,
    handY: torsoY - armLength / 2,
  }
  for (const detail of spec.details) {
    group.add(buildHeroDetail(detail, detailContext))
  }

  return group
}
