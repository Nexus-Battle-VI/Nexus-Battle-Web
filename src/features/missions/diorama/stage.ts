import type { ProgressEntry, ProgressRole } from '../missionPlayApi'

/**
 * Estado VISUAL del diorama tras reproducir la bitacora (remaster EN-031).
 *
 * No decide nada: cada cifra (vida del heroe, vida del enemigo, dano, si fue
 * critico, quien cayo, el desenlace) se COPIA de la entrada que publica
 * Missions. El cliente no calcula dano ni resultados; solo recuerda el ultimo
 * valor visto para poder pintarlo.
 */
export interface StageEnemy {
  readonly name: string
  readonly role: ProgressRole
  readonly maxHealth: number | null
  readonly health: number | null
  readonly enraged: boolean
  readonly defeated: boolean
}

export type BeatKind =
  | 'encounter'
  | 'appear'
  | 'heroStrike'
  | 'heroMiss'
  | 'heroAbility'
  | 'enemyStrike'
  | 'enemyMiss'
  | 'guard'
  | 'heal'
  | 'defeat'
  | 'cleared'
  | 'recover'
  | 'finish'

/** El ultimo momento reproducido: lo que se anima ahora mismo. */
export interface StageBeat {
  readonly seq: number
  readonly kind: BeatKind
  readonly damage: number | null
  readonly critical: boolean
  readonly ability: string | null
  readonly amount: number | null
}

export interface StageState {
  readonly encounter: number | null
  readonly boss: boolean
  readonly enemy: StageEnemy | null
  readonly heroHealth: number | null
  readonly beat: StageBeat | null
  readonly outcome: 'victory' | 'defeat' | null
}

export const initialStage = (heroHealth: number | null): StageState => ({
  encounter: null,
  boss: false,
  enemy: null,
  heroHealth,
  beat: null,
  outcome: null,
})

const beatOf = (entry: ProgressEntry, kind: BeatKind): StageBeat => ({
  seq: entry.seq,
  kind,
  damage: entry.damage ?? null,
  critical: entry.critical === true,
  ability: entry.ability ?? null,
  amount: entry.amount ?? null,
})

/** El enemigo al que se refiere la entrada: el actual o, si cambia, el nuevo. */
const enemyOf = (state: StageState, entry: ProgressEntry): StageEnemy | null => {
  if (entry.enemy === undefined) return state.enemy
  if (state.enemy?.name === entry.enemy) return state.enemy
  return {
    name: entry.enemy,
    role: entry.role ?? 'ENEMY',
    maxHealth: entry.maxHealth ?? null,
    health: entry.enemyHealth ?? entry.maxHealth ?? null,
    enraged: false,
    defeated: false,
  }
}

const withEnemyHealth = (enemy: StageEnemy | null, entry: ProgressEntry): StageEnemy | null =>
  enemy === null || entry.enemyHealth === undefined
    ? enemy
    : { ...enemy, health: entry.enemyHealth }

/** Una entrada mas sobre el estado anterior. */
export const advanceStage = (state: StageState, entry: ProgressEntry): StageState => {
  const heroHealth = entry.heroHealth ?? state.heroHealth
  switch (entry.kind) {
    case 'ENCOUNTER_STARTED':
      return {
        ...state,
        encounter: entry.encounter ?? state.encounter,
        boss: entry.boss === true,
        enemy: null,
        heroHealth,
        beat: beatOf(entry, 'encounter'),
      }
    case 'ENEMY_APPEARED':
      return {
        ...state,
        enemy: {
          name: entry.enemy ?? '',
          role: entry.role ?? 'ENEMY',
          maxHealth: entry.maxHealth ?? null,
          health: entry.enemyHealth ?? entry.maxHealth ?? null,
          enraged: false,
          defeated: false,
        },
        heroHealth,
        beat: beatOf(entry, 'appear'),
      }
    case 'HERO_ACTION':
      return {
        ...state,
        enemy: withEnemyHealth(enemyOf(state, entry), entry),
        heroHealth,
        beat: beatOf(
          entry,
          entry.attacked === false ? 'heroAbility' : entry.hit === true ? 'heroStrike' : 'heroMiss',
        ),
      }
    case 'ENEMY_ACTION': {
      const enemy = enemyOf(state, entry)
      return {
        ...state,
        enemy: enemy === null ? null : { ...enemy, enraged: entry.enraged === true },
        heroHealth,
        beat: beatOf(entry, entry.hit === true ? 'enemyStrike' : 'enemyMiss'),
      }
    }
    case 'ENEMY_GUARDED':
      return { ...state, enemy: enemyOf(state, entry), heroHealth, beat: beatOf(entry, 'guard') }
    case 'HERO_HEALED':
      return { ...state, heroHealth, beat: beatOf(entry, 'heal') }
    case 'DEFEATED': {
      const enemy = enemyOf(state, entry)
      return {
        ...state,
        enemy: enemy === null ? null : { ...enemy, health: 0, defeated: true },
        heroHealth,
        beat: beatOf(entry, 'defeat'),
      }
    }
    case 'ENCOUNTER_FINISHED':
      return { ...state, heroHealth, beat: beatOf(entry, 'cleared') }
    case 'HERO_RECOVERED':
      return { ...state, heroHealth, beat: beatOf(entry, 'recover') }
    case 'MISSION_FINISHED':
      return {
        ...state,
        heroHealth,
        outcome: entry.victory === true ? 'victory' : 'defeat',
        beat: beatOf(entry, 'finish'),
      }
    default:
      return state
  }
}

/** Reproduce, en orden, las primeras `count` entradas. */
export const stageAt = (
  entries: readonly ProgressEntry[],
  count: number,
  heroHealth: number | null,
): StageState => {
  let state = initialStage(heroHealth)
  for (const entry of entries.slice(0, count)) {
    state = advanceStage(state, entry)
  }
  return state
}
