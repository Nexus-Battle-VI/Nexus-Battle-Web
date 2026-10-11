/**
 * Manifiesto de los assets de PixelLab del remaster visual de Misiones
 * (Sprint 3, EN-031). Es el UNICO sitio que sabe que fichero de
 * `public/assets/missions/` corresponde a cada concepto de la interfaz, igual
 * que `battleRemasterAssets.ts` en Jugar Online. Ningun componente escribe
 * una ruta `/assets/missions/...` a mano (los fondos de pagina viven en
 * `missions.css`, como en los demas modulos).
 *
 * Procedencia y licencia de cada fichero: `docs/assets/inventario-activos.md`.
 * Nada se pide a PixelLab en tiempo de ejecucion.
 *
 * Este fichero esta en la raiz de la feature, asi que lo recorre el guard de
 * `noClientAuthority.test.ts`: solo datos, ningun calculo.
 */
import type { ProgressRole } from './missionPlayApi'

const BASE = '/assets/missions'

export type MissionsTheme = 'dark' | 'light'

type ByTheme<T> = Readonly<Record<MissionsTheme, T>>

const byTheme = (path: string): ByTheme<string> => ({
  dark: `${BASE}/${path}-dark.png`,
  light: `${BASE}/${path}-light.png`,
})

/** Escenas de cada `imageRef` que publica Missions (P-J11). */
export const missionScenes: Readonly<Record<string, ByTheme<string>>> = {
  'mision-camino-templo': byTheme('scenes/scene-camino-templo'),
  'mision-templo-olvidado': byTheme('scenes/scene-templo-olvidado'),
  'mision-camara-sellada': byTheme('scenes/scene-camara-sellada'),
  'mision-arena-caidos': byTheme('scenes/scene-arena-caidos'),
  'mision-travesia-bosque': byTheme('scenes/scene-travesia-bosque'),
}

export const MISSION_ICON_NAMES = [
  'story',
  'challenge',
  'exploration',
  'timer',
  'hero',
  'power',
  'chest',
  'xp',
  'epic',
  'boss',
  'master',
  'enemy',
  'objective',
  'difficulty',
  'victory',
  'defeat',
  'lock',
  'check',
  'history',
  'report',
  'loot',
  'heal',
  'map',
  'ability',
] as const

export type MissionIconName = (typeof MISSION_ICON_NAMES)[number]

export const missionIcons: Readonly<Record<MissionIconName, ByTheme<string>>> = Object.fromEntries(
  MISSION_ICON_NAMES.map((name) => [name, byTheme(`icons/icon-${name}`)]),
) as Record<MissionIconName, ByTheme<string>>

/**
 * Hoja de un personaje del diorama: una tira horizontal por animacion, de
 * celdas cuadradas, con el personaje mirando hacia el heroe (suroeste). Los
 * derivados salen de `scripts/process-missions-assets.mjs`. `frames` es el
 * numero de celdas de cada tira; sin ataque propio, `attack` es `null`.
 */
export interface EnemySpriteSpec {
  readonly idle: string
  readonly attack: string | null
  readonly frames: { readonly idle: number; readonly attack: number }
}

/**
 * Las tiras que exporta PixelLab. Los humanoides traen 8 fotogramas en reposo
 * (plantilla `fight-stance-idle-8-frames`) y 9 en el ataque (animacion `v3`,
 * con el fotograma de referencia); los cuadrupedos usan las plantillas de su
 * especie, con otra cuenta.
 */
const sprite = (slug: string, idle = 8, attack = 9): EnemySpriteSpec => ({
  idle: `${BASE}/sprites/${slug}-idle.png`,
  attack: `${BASE}/sprites/${slug}-attack.png`,
  frames: { idle, attack },
})

/** Criaturas sin plantilla de animacion: un unico fotograma, animado con CSS. */
const still = (slug: string): EnemySpriteSpec => ({
  idle: `${BASE}/sprites/${slug}-idle.png`,
  attack: null,
  frames: { idle: 1, attack: 0 },
})

/**
 * Sprite por NOMBRE, tal como Missions lo publica en la bitacora y en el
 * detalle (el nombre de la definicion, ver `ProgressPolicy` en Missions): los
 * enemigos, jefes y Másteres del contenido sembrado (`example-missions.ts`).
 */
export const enemySprites: Readonly<Record<string, EnemySpriteSpec>> = {
  // Enemigos comunes
  'Sombras Corrompidas': sprite('sombras-corrompidas'),
  'Guardianes de Piedra': sprite('guardianes-de-piedra'),
  'Espectros Ancestrales': sprite('espectros-ancestrales'),
  'Bandidos del Camino': sprite('bandidos-del-camino'),
  'Gladiadores Caídos': sprite('gladiadores-caidos'),
  'Centinela Arcano': sprite('centinela-arcano'),
  'Eco del Sello': sprite('eco-del-sello'),
  'Espíritus del Pantano': sprite('espiritus-del-pantano'),
  'Lobos Sombríos': sprite('lobos-sombrios', 8, 6),
  'Bestias de la Arena': sprite('bestias-de-la-arena', 9, 9),
  'Arañas de Niebla': still('aranas-de-niebla'),
  // Jefes finales
  'El Guardián Eterno': sprite('el-guardian-eterno'),
  'Custodio del Sello': sprite('custodio-del-sello'),
  'Garra, jefe de los bandidos': sprite('garra'),
  'Varkas, el Invicto': sprite('varkas-el-invicto'),
  'La Bruja del Pantano': sprite('la-bruja-del-pantano'),
  // Másteres
  'Sombra del Olvido': sprite('sombra-del-olvido'),
  'Hechicera del Sello': sprite('hechicera-del-sello'),
  'Coloso de Obsidiana': sprite('coloso-de-obsidiana'),
  'Campeón Carmesí': sprite('campeon-carmesi'),
  'Filo Errante': sprite('filo-errante'),
  'Llama Salvaje': sprite('llama-salvaje'),
  'Chamán de la Niebla': sprite('chaman-de-la-niebla'),
  'Cirujano Silente': sprite('cirujano-silente'),
}

/**
 * Un nombre desconocido (contenido nuevo creado desde el editor) usa el sprite
 * generico de su rol: un enemigo nunca queda sin arte.
 */
export const roleSprites: Readonly<Record<ProgressRole, EnemySpriteSpec>> = {
  ENEMY: sprite('sombras-corrompidas'),
  BOSS: sprite('el-guardian-eterno'),
  MASTER: sprite('sombra-del-olvido'),
}

export const enemySpriteFor = (
  name: string | undefined,
  role: ProgressRole | undefined,
): EnemySpriteSpec =>
  (name === undefined ? undefined : enemySprites[name]) ?? roleSprites[role ?? 'ENEMY']
