/**
 * Manifest de assets PixelLab aprobados para el remaster visual de "Jugar
 * Online" (Sprint 3). Correspondencia unica entre un concepto de la interfaz
 * y sus dos variantes reales (Dark/Light), derivadas de:
 *
 *   Sprint-3-Remaster-Visual/Juego Online/PixelLab/{01-Backgrounds,02-Frames,03-Buttons,04-Icons,05-Decorations}
 *
 * Los PNG fuente NUNCA se modifican; los derivados (recortes individuales de
 * cada hoja de sprites) viven en `public/assets/battle-rooms/` dentro de este
 * repo. Ver `AUDITORIA_JUGAR_ONLINE.md` y el informe de esta pasada para la
 * tabla completa original -> derivado -> componente.
 *
 * Ningun componente debe escribir una ruta `/assets/battle-rooms/...` a
 * mano: siempre a traves de este archivo, para que exista un unico lugar que
 * sepa que archivo real corresponde a que concepto (mismo criterio que
 * `features/commerce/marketplace/marketplaceAssets.ts`).
 *
 * Descartados (hollow, sin superficie util para texto/contenido encima, ver
 * la seccion 16 del informe): `button-selector-{theme}.png` (las 4 variantes
 * de la hoja tienen 0% de relleno en el centro) y el `button-secondary-
 * {theme}.png.png` original (marco fino sin relleno). En su lugar, las 4
 * variantes SOLIDAS de `button-compact-{theme}.png` cubren primary-adjacent/
 * secondary/toggle-off/toggle-on.
 */

const BASE = '/assets/battle-rooms'

export type BattleTheme = 'dark' | 'light'

type ByTheme<T> = Readonly<Record<BattleTheme, T>>

export const battleBackgrounds: Readonly<Record<'lobby' | 'waiting' | 'battle', ByTheme<string>>> =
  {
    lobby: {
      dark: `${BASE}/backgrounds/bg-play-lobby-dark.png`,
      light: `${BASE}/backgrounds/bg-play-lobby-light.png`,
    },
    waiting: {
      dark: `${BASE}/backgrounds/bg-play-waiting-dark.png`,
      light: `${BASE}/backgrounds/bg-play-waiting-light.png`,
    },
    battle: {
      dark: `${BASE}/backgrounds/bg-play-battle-dark.png`,
      light: `${BASE}/backgrounds/bg-play-battle-light.png`,
    },
  }

/**
 * `slice`/`width` son para `border-image-slice`/`border-image-width` (mismo
 * patron que `marketplaceFrames`). `frame-panel` y `frame-result` son el PNG
 * completo (no requirieron recorte); `frame-meter`, `frame-combatant` y
 * `frame-team-slot` son recortes de la variante util dentro de su hoja
 * fuente (ver informe, tabla de manifest).
 */
export const battleFrames: Readonly<
  Record<
    'panel' | 'meter' | 'result' | 'combatant' | 'teamSlot',
    ByTheme<{ src: string; slice: string; width: string }>
  >
> = {
  panel: {
    dark: { src: `${BASE}/frames/frame-panel-dark.png`, slice: '28', width: '14px' },
    light: { src: `${BASE}/frames/frame-panel-light.png`, slice: '28', width: '14px' },
  },
  meter: {
    dark: { src: `${BASE}/frames/frame-meter-dark.png`, slice: '10 14', width: '5px 7px' },
    light: { src: `${BASE}/frames/frame-meter-light.png`, slice: '10 14', width: '5px 7px' },
  },
  result: {
    dark: { src: `${BASE}/frames/frame-result-dark.png`, slice: '32', width: '16px' },
    light: { src: `${BASE}/frames/frame-result-light.png`, slice: '32', width: '16px' },
  },
  combatant: {
    dark: { src: `${BASE}/frames/frame-combatant-dark.png`, slice: '16', width: '10px' },
    light: { src: `${BASE}/frames/frame-combatant-light.png`, slice: '16', width: '10px' },
  },
  teamSlot: {
    dark: { src: `${BASE}/frames/frame-team-slot-dark.png`, slice: '14', width: '8px' },
    light: { src: `${BASE}/frames/frame-team-slot-light.png`, slice: '14', width: '8px' },
  },
}

/** Botones reales, sin texto quemado: superficies solidas de `button-compact.png` recortadas. */
export const battleButtons: Readonly<
  Record<'primary' | 'danger' | 'secondary' | 'toggleOff' | 'toggleOn' | 'compact', ByTheme<string>>
> = {
  primary: {
    dark: `${BASE}/buttons/button-primary-dark.png`,
    light: `${BASE}/buttons/button-primary-light.png`,
  },
  danger: {
    dark: `${BASE}/buttons/button-danger-dark.png`,
    light: `${BASE}/buttons/button-danger-light.png`,
  },
  secondary: {
    dark: `${BASE}/buttons/button-secondary-dark.png`,
    light: `${BASE}/buttons/button-secondary-light.png`,
  },
  toggleOff: {
    dark: `${BASE}/buttons/button-toggle-off-dark.png`,
    light: `${BASE}/buttons/button-toggle-off-light.png`,
  },
  toggleOn: {
    dark: `${BASE}/buttons/button-toggle-on-dark.png`,
    light: `${BASE}/buttons/button-toggle-on-light.png`,
  },
  compact: {
    dark: `${BASE}/buttons/button-compact-dark.png`,
    light: `${BASE}/buttons/button-compact-light.png`,
  },
}

export type BattleIconName =
  | 'lobby'
  | 'createJoin'
  | 'roomList'
  | 'refresh'
  | 'pvp'
  | 'pve'
  | 'credits'
  | 'wager'
  | 'chat'
  | 'equipment'
  | 'health'
  | 'power'
  | 'target'
  | 'attack'
  | 'skill'
  | 'timer'
  | 'roomClosed'
  | 'chest'
  | 'victory'
  | 'defeat'

const ICON_FILE: Readonly<Record<BattleIconName, string>> = {
  lobby: 'lobby',
  createJoin: 'create-join',
  roomList: 'room-list',
  refresh: 'refresh',
  pvp: 'pvp',
  pve: 'pve',
  credits: 'credits',
  wager: 'wager',
  chat: 'chat',
  equipment: 'equipment',
  health: 'health',
  power: 'power',
  target: 'target',
  attack: 'attack',
  skill: 'skill',
  timer: 'timer',
  roomClosed: 'room-closed',
  chest: 'chest',
  victory: 'victory',
  defeat: 'defeat',
}

export const battleIcons: Readonly<Record<BattleIconName, ByTheme<string>>> = Object.fromEntries(
  Object.entries(ICON_FILE).map(([name, file]) => [
    name,
    { dark: `${BASE}/icons/icon-${file}-dark.png`, light: `${BASE}/icons/icon-${file}-light.png` },
  ]),
) as Readonly<Record<BattleIconName, ByTheme<string>>>

export type BattleDecorationName =
  | 'turnRing'
  | 'vsDivider'
  | 'sectionDivider'
  | 'cornerTl'
  | 'cornerTr'
  | 'cornerBl'
  | 'cornerBr'
  | 'victoryWreath'
  | 'defeatWreath'
  | 'rewardAura'
  | 'teamBanner'

const DECORATION_FILE: Readonly<Record<BattleDecorationName, string>> = {
  turnRing: 'turn-ring',
  vsDivider: 'vs-divider',
  sectionDivider: 'section-divider',
  cornerTl: 'corner-tl',
  cornerTr: 'corner-tr',
  cornerBl: 'corner-bl',
  cornerBr: 'corner-br',
  victoryWreath: 'victory-wreath',
  defeatWreath: 'defeat-wreath',
  rewardAura: 'reward-aura',
  teamBanner: 'team-banner',
}

export const battleDecorations: Readonly<Record<BattleDecorationName, ByTheme<string>>> =
  Object.fromEntries(
    Object.entries(DECORATION_FILE).map(([name, file]) => [
      name,
      {
        dark: `${BASE}/decorations/decoration-${file}-dark.png`,
        light: `${BASE}/decorations/decoration-${file}-light.png`,
      },
    ]),
  ) as Readonly<Record<BattleDecorationName, ByTheme<string>>>
