import { HERO_IDS } from './hero-ids'
import type { HeroId } from './hero-ids'

/** Arquetipo de proporcion corporal. Solo afecta geometria, no comportamiento. */
export type HeroSilhouette = 'bulky' | 'balanced' | 'slender'

/**
 * Acento geometrico abstracto que ayuda a distinguir la silueta de cada
 * heroe. Deliberadamente NO representa un arma, armadura o item del
 * inventario de EN-026.1 (p.ej. `crest` no es "Lanza de los dioses", `flame`
 * no es "Orbe de manos ardientes"): son formas genericas de identidad visual,
 * no equipamiento renderizado.
 */
export type HeroAccent =
  'shoulderBlock' | 'crest' | 'flame' | 'crystal' | 'hood' | 'band' | 'antlers' | 'halo'

/**
 * Rasgo visual distintivo, adicional al `HeroAccent` de silueta. Ayuda a que
 * la identidad de cada heroe se entienda "a primera vista" (p.ej. un casco
 * para el Guerrero Tanque, una cruz medica abstracta para el Medico, un
 * pequeño simbolo en el pecho para reforzar el arquetipo).
 *
 * Deliberadamente NO representa equipamiento real del inventario de
 * `EN-026.1`: `blade` no es "Espada de una mano" ni "Machete vendito",
 * `chestWeaponMark`/`chestMacheteMark` no son esas mismas armas en miniatura,
 * son formas genericas y ligeras que solo comunican arquetipo. No se conecta
 * a inventario, stats, combate ni habilidades.
 *
 * Varios tipos se reutilizan deliberadamente entre heroes con `scale`/`color`
 * distintos, en vez de crear un tipo nuevo por heroe:
 * - `blade`: Guerrero Armas y Pícaro Machete (mano);
 * - `chestWeaponMark`/`chestMacheteMark`: variantes del mismo lenguaje visual
 *   ("simbolo de arma en el pecho"), diferenciadas para que Guerrero Armas y
 *   Pícaro Machete no luzcan identicos en el pecho.
 */
export type HeroDetailType =
  | 'helmet'
  | 'blade'
  | 'flameWisp'
  | 'iceShard'
  | 'serpentCoil'
  | 'ritualCrown'
  | 'medicalCross'
  | 'chestWeaponMark'
  | 'chestMacheteMark'
  | 'chestFireMark'
  | 'chestIceMark'
  | 'chestPoisonMark'
  | 'chestMagicStars'

/** Zona del modelo donde se ancla el detalle. Solo orienta la posicion; no implica un slot de equipamiento. */
export type HeroDetailPlacement = 'head' | 'chest' | 'handRight' | 'handLeft' | 'side'

/** Descriptor de un `HeroDetailType` concreto para un heroe. `scale` permite reutilizar el mismo tipo con otra magnitud (ver `blade`). */
export interface HeroDetailSpec {
  readonly type: HeroDetailType
  readonly placement: HeroDetailPlacement
  readonly color: string
  readonly scale?: number
}

/**
 * Datos exclusivamente visuales para construir el modelo 3D de un heroe.
 * `displayName` reutiliza el nombre oficial de EN-026.1 solo para
 * presentacion/accesibilidad; no redefine contenido funcional. No contiene
 * ningun dato de reglas de juego (dano, vida, rareza, cooldown).
 *
 * `details` admite uno o mas `HeroDetailSpec`: la mayoria de heroes combinan
 * su detalle original (mano/cabeza/costado) con un simbolo adicional en el
 * pecho; el Guerrero Tanque conserva un unico detalle porque no se le pidio
 * ninguno nuevo.
 */
export interface HeroVisualSpec {
  readonly id: HeroId
  readonly displayName: string
  readonly silhouette: HeroSilhouette
  readonly bodyColor: string
  readonly accent: HeroAccent
  readonly accentColor: string
  readonly details: readonly HeroDetailSpec[]
}

const DEFINITIONS: Readonly<Record<HeroId, HeroVisualSpec>> = {
  'guerrero-tanque': {
    id: 'guerrero-tanque',
    displayName: 'Guerrero Tanque',
    silhouette: 'bulky',
    bodyColor: '#5b6472',
    accent: 'shoulderBlock',
    accentColor: '#8a94a6',
    details: [{ type: 'helmet', placement: 'head', color: '#c7ccd6' }],
  },
  'guerrero-armas': {
    id: 'guerrero-armas',
    displayName: 'Guerrero Armas',
    silhouette: 'balanced',
    bodyColor: '#7a3b3b',
    accent: 'crest',
    accentColor: '#c0524f',
    details: [
      { type: 'blade', placement: 'handRight', color: '#d8dde3', scale: 1.15 },
      { type: 'chestWeaponMark', placement: 'chest', color: '#c0524f' },
    ],
  },
  'mago-fuego': {
    id: 'mago-fuego',
    displayName: 'Mago Fuego',
    silhouette: 'slender',
    bodyColor: '#7a3a12',
    accent: 'flame',
    accentColor: '#e8792b',
    details: [
      { type: 'flameWisp', placement: 'handRight', color: '#ffb066' },
      { type: 'chestFireMark', placement: 'chest', color: '#e8792b' },
    ],
  },
  'mago-hielo': {
    id: 'mago-hielo',
    displayName: 'Mago Hielo',
    silhouette: 'slender',
    bodyColor: '#2c5b66',
    accent: 'crystal',
    accentColor: '#7fd8e8',
    details: [
      { type: 'iceShard', placement: 'handLeft', color: '#bff2ff' },
      { type: 'chestIceMark', placement: 'chest', color: '#7fd8e8' },
    ],
  },
  'picaro-veneno': {
    id: 'picaro-veneno',
    displayName: 'Pícaro Veneno',
    silhouette: 'slender',
    bodyColor: '#33482f',
    accent: 'hood',
    accentColor: '#7bb442',
    details: [
      { type: 'serpentCoil', placement: 'side', color: '#9be05a' },
      { type: 'chestPoisonMark', placement: 'chest', color: '#5f9c2c' },
    ],
  },
  'picaro-machete': {
    id: 'picaro-machete',
    displayName: 'Pícaro Machete',
    silhouette: 'balanced',
    bodyColor: '#5c4a22',
    accent: 'band',
    accentColor: '#d1a53d',
    details: [
      { type: 'blade', placement: 'handRight', color: '#e4c26a', scale: 0.75 },
      { type: 'chestMacheteMark', placement: 'chest', color: '#d1a53d' },
    ],
  },
  chaman: {
    id: 'chaman',
    displayName: 'Chamán',
    silhouette: 'balanced',
    bodyColor: '#3f4d2c',
    accent: 'antlers',
    accentColor: '#9c7b4f',
    details: [
      { type: 'ritualCrown', placement: 'head', color: '#c9a869' },
      { type: 'chestMagicStars', placement: 'chest', color: '#e3cf8a' },
    ],
  },
  medico: {
    id: 'medico',
    displayName: 'Médico',
    silhouette: 'balanced',
    bodyColor: '#e7e9ec',
    accent: 'halo',
    accentColor: '#8fd0e0',
    details: [{ type: 'medicalCross', placement: 'chest', color: '#d64545', scale: 1.4 }],
  },
}

/** Las ocho especificaciones visuales, en el mismo orden que `HERO_IDS`. */
export const HERO_VISUAL_SPECS: readonly HeroVisualSpec[] = HERO_IDS.map((id) => DEFINITIONS[id])

/** Busqueda segura por un id arbitrario (no necesariamente uno de los ocho). */
export const HERO_VISUAL_SPECS_BY_ID: ReadonlyMap<string, HeroVisualSpec> = new Map(
  HERO_VISUAL_SPECS.map((spec) => [spec.id, spec]),
)
