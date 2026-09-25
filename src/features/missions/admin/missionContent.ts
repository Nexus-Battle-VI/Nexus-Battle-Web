import { localizedMessages } from '@/shared/i18n/messages'
import { i18n } from '@/shared/i18n/i18n'
/**
 * Modelo del editor de contenido de misiones (`/admin/missions`).
 *
 * El formulario edita la MISMA forma que guarda Missions (`MissionDefinition`,
 * `PUT /api/v1/admin/missions/{id}`), no una copia propia: asi un campo que el
 * editor aun no conoce viaja intacto de ida y vuelta. Lo que Missions exige que
 * cuadre entre partes lo calcula `prepareForSave` y no el administrador:
 *
 * - el total de cada enemigo es la suma de sus apariciones en los encuentros;
 * - el encuentro del jefe es siempre el ultimo y lleva solo al jefe;
 * - las estadisticas visibles del jefe salen de su perfil de combate;
 * - `rewards.potential` repite el botin del jefe.
 *
 * Es contenido, no un resultado de juego: aqui si se suma y se convierte a
 * porcentaje. La autoridad sigue siendo Missions, que valida al guardar.
 */

export const MISSION_CATEGORIES = ['STORY', 'CHALLENGE', 'EXPLORATION'] as const
export type MissionContentCategory = (typeof MISSION_CATEGORIES)[number]

export const CATEGORY_LABELS: Readonly<Record<MissionContentCategory, string>> = localizedMessages({
  STORY: 'missions:category.STORY',
  CHALLENGE: 'missions:category.CHALLENGE',
  EXPLORATION: 'missions:category.EXPLORATION',
})

export const HERO_SUBTYPES = [
  'GUERRERO_TANQUE',
  'GUERRERO_ARMAS',
  'MAGO_FUEGO',
  'MAGO_HIELO',
  'PICARO_VENENO',
  'PICARO_MACHETE',
  'CHAMAN',
  'MEDICO',
] as const

export const DIFFICULTY_LEVELS = ['NORMAL', 'HEROIC', 'LEGENDARY', 'MYTHIC'] as const
export type ContentDifficulty = (typeof DIFFICULTY_LEVELS)[number]

export const DIFFICULTY_LABELS: Readonly<Record<ContentDifficulty, string>> = localizedMessages({
  NORMAL: 'missions:difficulty.NORMAL',
  HEROIC: 'missions:difficulty.HEROIC',
  LEGENDARY: 'missions:difficulty.LEGENDARY',
  MYTHIC: 'missions:difficulty.MYTHIC',
})

export const AI_LABELS = localizedMessages({
  AGGRESSIVE: 'admin:missions.ai.AGGRESSIVE',
  GUARDED: 'admin:missions.ai.GUARDED',
  BOSS: 'admin:missions.ai.BOSS',
})
export type FighterAi = 'AGGRESSIVE' | 'GUARDED' | 'BOSS'

/** Ilustraciones que dibuja la Web (P-J11); sin una, se usa la de la categoria. */
export const IMAGE_REFS: readonly { readonly value: string; readonly label: string }[] = [
  { value: 'mision-camino-templo', get label() { return i18n.t('admin:missions.image.caminoTemplo') } },
  { value: 'mision-templo-olvidado', get label() { return i18n.t('admin:missions.image.temploOlvidado') } },
  { value: 'mision-camara-sellada', get label() { return i18n.t('admin:missions.image.camaraSellada') } },
  { value: 'mision-arena-caidos', get label() { return i18n.t('admin:missions.image.arenaCaidos') } },
  { value: 'mision-travesia-bosque', get label() { return i18n.t('admin:missions.image.travesiaBosque') } },
]

export type DamageSpec =
  | number
  | { readonly mode: 'FIXED'; readonly amount: number }
  | { readonly mode: 'DICE'; readonly count: number; readonly sides: number }

/** Perfil de combate de un enemigo, jefe o Master (la forma que valida Missions). */
export interface FighterProfile {
  readonly maxHealth: number
  readonly attack: number
  readonly defense: number
  readonly damage: DamageSpec
  readonly ai?: FighterAi
  readonly enrageBelowPercent?: number
  readonly enrageAttackBonus?: number
  readonly [extra: string]: unknown
}

export interface ContentEnemy {
  readonly enemyRef: string
  readonly name: string
  readonly count: number
  readonly description: string | null
  readonly profile: FighterProfile
  readonly [extra: string]: unknown
}

export interface ContentDrop {
  readonly label: string
  readonly probability: number
  readonly rolls: number
  readonly productId?: string | null
}

export interface ContentBoss {
  readonly enemyRef: string
  readonly name: string
  readonly heroType: string | null
  readonly description: string | null
  readonly stats: Readonly<Record<string, number>>
  readonly profile: FighterProfile
  readonly drops?: readonly ContentDrop[]
  readonly [extra: string]: unknown
}

export interface EncounterGroup {
  readonly enemyRef: string
  readonly count: number
}

export interface ContentEncounter {
  readonly index: number
  readonly kind: 'REGULAR' | 'BOSS'
  readonly powerStep: number | null
  readonly enemies: readonly EncounterGroup[]
}

export const OBJECTIVE_TYPES = [
  'DEFEAT_BOSS',
  'CLEAR_ENCOUNTERS',
  'MIN_HEALTH_PERCENT',
  'DEFEAT_MASTER',
  'COLLECT_LOOT',
] as const
export type ObjectiveType = (typeof OBJECTIVE_TYPES)[number]

export const OBJECTIVE_LABELS: Readonly<Record<ObjectiveType | 'NONE', string>> = localizedMessages({
  NONE: 'admin:missions.objective.NONE',
  DEFEAT_BOSS: 'admin:missions.objective.DEFEAT_BOSS',
  CLEAR_ENCOUNTERS: 'admin:missions.objective.CLEAR_ENCOUNTERS',
  MIN_HEALTH_PERCENT: 'admin:missions.objective.MIN_HEALTH_PERCENT',
  DEFEAT_MASTER: 'admin:missions.objective.DEFEAT_MASTER',
  COLLECT_LOOT: 'admin:missions.objective.COLLECT_LOOT',
})

export type ObjectiveRule =
  | { readonly type: 'DEFEAT_BOSS' }
  | { readonly type: 'CLEAR_ENCOUNTERS'; readonly count: number }
  | { readonly type: 'MIN_HEALTH_PERCENT'; readonly percent: number }
  | { readonly type: 'DEFEAT_MASTER' }
  | { readonly type: 'COLLECT_LOOT'; readonly label: string; readonly count: number }

export interface ContentObjective {
  readonly id: string
  readonly text: string
  readonly primary: boolean
  readonly rule: ObjectiveRule | null
}

export interface ContentEpic {
  readonly epicRef: string
  readonly name: string
  readonly generalEffect: string | null
  readonly epicEffect: string | null
  readonly productId: string | null
}

export interface ContentMasterCandidate {
  readonly masterRef: string
  readonly name: string
  readonly subtype: string
  readonly levelOffset: number
  readonly profile: FighterProfile
  readonly probabilityByHeroType: Readonly<Record<string, number>>
  readonly epic: ContentEpic
  readonly [extra: string]: unknown
}

export interface ContentMaster {
  readonly evaluationPoints: readonly { readonly afterEncounter: number }[]
  readonly maxAppearances?: number
  readonly candidates: readonly ContentMasterCandidate[]
}

export interface ContentRules {
  readonly turnDurationSeconds: number
  readonly maxTurnsPerEncounter: number
  readonly recoveryPercent: number
  readonly criticalChance: number
  readonly criticalMultiplier: number
  readonly difficultyMultipliers?: Readonly<Record<ContentDifficulty, number>>
  readonly supportAttack?: number
  readonly supportDamage?: number
  readonly supportRegen?: number
  readonly [extra: string]: unknown
}

export interface RewardLabel {
  readonly label: string
}

export interface ContentRewards {
  readonly guaranteed: readonly RewardLabel[]
  readonly potential: readonly ContentDrop[]
  readonly objectiveBonuses: readonly RewardLabel[]
  readonly firstTime: readonly RewardLabel[]
  readonly [extra: string]: unknown
}

export interface MissionContent {
  readonly missionId: string
  readonly name: string
  readonly category: MissionContentCategory
  readonly summary: string
  readonly narrative: string
  readonly imageRef: string | null
  readonly estimatedDurationMinutes: number
  readonly recommendedPower: number | null
  readonly prerequisites: readonly string[]
  readonly objectives: readonly ContentObjective[]
  readonly enemies: readonly ContentEnemy[]
  readonly finalBoss: ContentBoss
  readonly encounters: readonly ContentEncounter[]
  readonly combatRules: ContentRules
  readonly masterEncounter: ContentMaster | null
  readonly rewards: ContentRewards
  readonly highlightedRewards: readonly RewardLabel[]
  readonly active: boolean
  readonly [extra: string]: unknown
}

/** Las 8 epicas oficiales de la Tabla 20, con los textos de sus productos. */
export const OFFICIAL_EPICS: readonly (Omit<ContentEpic, 'productId'> & {
  readonly subtype: string
})[] = [
  {
    epicRef: 'golpe-de-defensa',
    name: 'Golpe de defensa',
    subtype: 'GUERRERO_TANQUE',
    generalEffect: '+1 al ataque para todos los héroes.',
    epicEffect: 'Solo Guerrero Tanque: +4 al daño y +2 % de crítico.',
  },
  {
    epicRef: 'segundo-impulso',
    name: 'Segundo impulso',
    subtype: 'GUERRERO_ARMAS',
    generalEffect: 'Todos los héroes recuperan 1d4 de vida.',
    epicEffect: 'Solo Guerrero Armas: +3 a la vida y +5 % de crítico.',
  },
  {
    epicRef: 'luz-cegadora',
    name: 'Luz cegadora',
    subtype: 'MAGO_FUEGO',
    generalEffect: '+1 a la vida para todos los héroes.',
    epicEffect: 'Solo Mago Fuego: +2 al daño y +1 % de crítico.',
  },
  {
    epicRef: 'frio-concentrado',
    name: 'Frío concentrado',
    subtype: 'MAGO_HIELO',
    generalEffect: '−1 de poder al oponente.',
    epicEffect: 'Solo Mago Hielo: no recibe ningún daño en el turno siguiente.',
  },
  {
    epicRef: 'toma-y-lleva',
    name: 'Toma y lleva',
    subtype: 'PICARO_VENENO',
    generalEffect: '+1 al ataque para todos los héroes.',
    epicEffect:
      'Solo Pícaro Veneno: disminuye a la mitad el daño causado por el oponente y se lo retorna.',
  },
  {
    epicRef: 'intimidacion-sangrienta',
    name: 'Intimidación sangrienta',
    subtype: 'PICARO_MACHETE',
    generalEffect: '+2 al ataque para todos los héroes.',
    epicEffect: 'Solo Pícaro Machete: +2 a la vida y +2 % de crítico.',
  },
  {
    epicRef: 'te-changua',
    name: 'Té changua',
    subtype: 'CHAMAN',
    generalEffect: 'Sana a todos los aliados 4d8 de vida.',
    epicEffect:
      'Solo Chamán: se asocia con un compañero; si este cae, revive con el 20 % de su salud.',
  },
  {
    epicRef: 'reanimador-3000',
    name: 'Reanimador 3000',
    subtype: 'MEDICO',
    generalEffect: 'Sin efecto general.',
    epicEffect:
      'Solo Médico: se asocia con un compañero; si este cae, revive con el 20 % de su salud.',
  },
]

/** Identificador legible a partir de un texto: minusculas, sin tildes y con guiones. */
export const slugify = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 60)

/** `base` si esta libre; si no, `base-2`, `base-3`… */
export const uniqueRef = (base: string, taken: ReadonlySet<string>): string => {
  const root = base === '' ? 'elemento' : base
  if (!taken.has(root)) return root
  let n = 2
  while (taken.has(`${root}-${String(n)}`)) n += 1
  return `${root}-${String(n)}`
}

export type DamageForm =
  | { readonly mode: 'FIXED'; readonly amount: number }
  | { readonly mode: 'DICE'; readonly count: number; readonly sides: number }

/** El daño del perfil como lo muestra el formulario: fijo o en dados. */
export const damageOf = (damage: DamageSpec): DamageForm =>
  typeof damage === 'number' ? { mode: 'FIXED', amount: damage } : damage

/** Estadisticas visibles del jefe: las de su perfil (el daño solo si es fijo). */
export const bossStatsOf = (profile: FighterProfile): Readonly<Record<string, number>> => {
  const damage = damageOf(profile.damage)
  return {
    health: profile.maxHealth,
    attack: profile.attack,
    defense: profile.defense,
    ...(damage.mode === 'FIXED' ? { damage: damage.amount } : {}),
  }
}

export const regularEncountersOf = (content: MissionContent): readonly ContentEncounter[] =>
  content.encounters.filter((encounter) => encounter.kind === 'REGULAR')

/**
 * Encuentros con la estructura que exige Missions: los regulares numerados
 * desde 1 y, al final, el del jefe con el jefe solo.
 */
export const withRegularEncounters = (
  content: MissionContent,
  regular: readonly ContentEncounter[],
): MissionContent => {
  const boss = content.encounters.find((encounter) => encounter.kind === 'BOSS')
  return {
    ...content,
    encounters: [
      ...regular.map((encounter, position) => ({
        ...encounter,
        index: position + 1,
        kind: 'REGULAR' as const,
      })),
      {
        index: regular.length + 1,
        kind: 'BOSS' as const,
        powerStep: boss?.powerStep ?? 0,
        enemies: [{ enemyRef: content.finalBoss.enemyRef, count: 1 }],
      },
    ],
  }
}

/** Cuantas veces aparece cada enemigo en los encuentros regulares. */
export const appearancesOf = (content: MissionContent): ReadonlyMap<string, number> => {
  const totals = new Map<string, number>()
  for (const encounter of regularEncountersOf(content)) {
    for (const group of encounter.enemies) {
      totals.set(group.enemyRef, (totals.get(group.enemyRef) ?? 0) + group.count)
    }
  }
  return totals
}

/**
 * Probabilidad de que salga algun Master en una partida, con la probabilidad
 * general (`*`). En cada momento se prueba a los candidatos en orden y sale como
 * mucho uno, asi que un momento no saca ninguno con (1 - p1)(1 - p2)… Es la
 * misma cuenta que `masterAppearanceChanceOf` de Missions para un heroe sin
 * probabilidad propia.
 */
export const masterChanceOf = (master: ContentMaster): number => {
  const noneAtAPoint = master.candidates.reduce((product, candidate) => {
    const probability = candidate.probabilityByHeroType['*'] ?? 0
    return product * (1 - (Number.isFinite(probability) ? probability : 0))
  }, 1)
  const points = new Set(master.evaluationPoints.map((point) => point.afterEncounter)).size
  return 1 - noneAtAPoint ** points
}

const trimmedOrNull = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

/**
 * La definicion tal como se envia a Missions: lo derivado calculado y los
 * textos recortados. No valida: eso es `validateMissionContent` y, al final,
 * Missions.
 */
export const prepareForSave = (content: MissionContent): MissionContent => {
  const structured = withRegularEncounters(content, regularEncountersOf(content))
  const appearances = appearancesOf(structured)
  const drops = (structured.finalBoss.drops ?? []).map((drop) => ({
    ...drop,
    label: drop.label.trim(),
    productId: drop.productId ?? null,
  }))
  const master = structured.masterEncounter

  return {
    ...structured,
    name: structured.name.trim(),
    summary: structured.summary.trim(),
    narrative: structured.narrative.trim(),
    enemies: structured.enemies.map((enemy) => ({
      ...enemy,
      name: enemy.name.trim(),
      description: trimmedOrNull(enemy.description),
      count: appearances.get(enemy.enemyRef) ?? 0,
    })),
    finalBoss: {
      ...structured.finalBoss,
      name: structured.finalBoss.name.trim(),
      description: trimmedOrNull(structured.finalBoss.description),
      stats: bossStatsOf(structured.finalBoss.profile),
      drops,
    },
    objectives: structured.objectives.map((objective) => ({
      ...objective,
      text: objective.text.trim(),
    })),
    masterEncounter:
      master === null
        ? null
        : {
            ...master,
            evaluationPoints: [...new Set(master.evaluationPoints.map((p) => p.afterEncounter))]
              .sort((a, b) => a - b)
              .map((afterEncounter) => ({ afterEncounter })),
          },
    rewards: {
      ...structured.rewards,
      potential: drops.map(({ label, probability, rolls }) => ({ label, probability, rolls })),
    },
  }
}

export const DEFAULT_RULES: ContentRules = {
  turnDurationSeconds: 60,
  maxTurnsPerEncounter: 300,
  recoveryPercent: 35,
  criticalChance: 0.1,
  criticalMultiplier: 1.5,
  difficultyMultipliers: { NORMAL: 1, HEROIC: 1.5, LEGENDARY: 2, MYTHIC: 2.5 },
  supportAttack: 10,
  supportDamage: 3,
  supportRegen: 1,
}

export const newEnemyProfile = (): FighterProfile => ({
  maxHealth: 8,
  attack: 3,
  defense: 4,
  damage: { mode: 'DICE', count: 1, sides: 4 },
  ai: 'AGGRESSIVE',
})

export const newMasterCandidate = (taken: ReadonlySet<string>): ContentMasterCandidate => {
  const epic = OFFICIAL_EPICS[1]
  return {
    masterRef: uniqueRef('nuevo-master', taken),
    name: 'Nuevo Máster',
    subtype: epic?.subtype ?? 'GUERRERO_ARMAS',
    levelOffset: 2,
    profile: {
      maxHealth: 40,
      attack: 8,
      defense: 6,
      damage: { mode: 'DICE', count: 1, sides: 6 },
      ai: 'AGGRESSIVE',
    },
    probabilityByHeroType: { '*': 0.15 },
    epic: {
      epicRef: epic?.epicRef ?? 'epica',
      name: epic?.name ?? 'Épica',
      generalEffect: epic?.generalEffect ?? null,
      epicEffect: epic?.epicEffect ?? null,
      productId: null,
    },
  }
}

/** Una mision nueva, inactiva, con un identificador libre. */
export const newMission = (takenIds: ReadonlySet<string>): MissionContent =>
  prepareForSave({
    missionId: uniqueRef('msn_nueva_mision', takenIds),
    name: 'Nueva misión',
    category: 'STORY',
    summary: 'Resumen que verá el jugador en el tablón.',
    narrative: 'Historia de la misión.',
    imageRef: null,
    estimatedDurationMinutes: 60,
    recommendedPower: null,
    prerequisites: [],
    objectives: [
      { id: 'obj_jefe', text: 'Derrotar al jefe.', primary: true, rule: { type: 'DEFEAT_BOSS' } },
    ],
    enemies: [
      {
        enemyRef: 'esbirro',
        name: 'Esbirros',
        count: 3,
        description: null,
        profile: newEnemyProfile(),
      },
    ],
    finalBoss: {
      enemyRef: 'jefe',
      name: 'Jefe',
      heroType: null,
      description: null,
      stats: {},
      profile: {
        maxHealth: 40,
        attack: 4,
        defense: 5,
        damage: { mode: 'DICE', count: 1, sides: 6 },
        ai: 'BOSS',
        enrageBelowPercent: 50,
        enrageAttackBonus: 2,
      },
      drops: [],
    },
    encounters: [
      { index: 1, kind: 'REGULAR', powerStep: 0, enemies: [{ enemyRef: 'esbirro', count: 3 }] },
    ],
    combatRules: DEFAULT_RULES,
    masterEncounter: null,
    rewards: { guaranteed: [], potential: [], objectiveBonuses: [], firstTime: [] },
    highlightedRewards: [],
    active: false,
  })

/** Copia inactiva de una mision, con otro identificador y otro nombre. */
export const duplicateMission = (
  source: MissionContent,
  takenIds: ReadonlySet<string>,
): MissionContent => ({
  ...structuredClone(source),
  missionId: uniqueRef(`${source.missionId}_copia`, takenIds),
  name: `${source.name} (copia)`,
  active: false,
})
