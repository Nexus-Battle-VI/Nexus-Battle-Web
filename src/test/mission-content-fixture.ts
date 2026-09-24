import { DEFAULT_RULES, type MissionContent } from '@/features/missions/admin/missionContent'

/** Producto de Catalog que las pruebas enlazan como botin. */
export const RELIC_PRODUCT = {
  productId: '5b0c2c5e-8f4a-4c1e-9d2b-3a4b5c6d7e8f',
  name: 'Reliquia antigua',
  type: 'ITEM',
} as const

/**
 * Datos controlados exclusivamente de pruebas: una mision completa y valida,
 * con la forma que devuelve `GET /api/v1/admin/missions`. Dos tipos de enemigo
 * repartidos en dos encuentros, jefe con botin y un Master.
 */
export const missionContentFixture = (): MissionContent => ({
  missionId: 'msn_templo_olvidado',
  name: 'El templo olvidado',
  category: 'STORY',
  summary: 'Explora el templo y vence a su guardián.',
  narrative: 'Nadie ha vuelto del templo desde hace un siglo.',
  imageRef: 'mision-templo-olvidado',
  estimatedDurationMinutes: 720,
  recommendedPower: null,
  prerequisites: [],
  objectives: [
    {
      id: 'obj_jefe',
      text: 'Derrotar al guardián eterno.',
      primary: true,
      rule: { type: 'DEFEAT_BOSS' },
    },
    {
      id: 'obj_reliquia',
      text: 'Conseguir la reliquia.',
      primary: false,
      rule: { type: 'COLLECT_LOOT', label: 'Reliquia', count: 1 },
    },
  ],
  enemies: [
    {
      enemyRef: 'sombra',
      name: 'Sombra corrompida',
      count: 4,
      description: null,
      profile: { maxHealth: 5, attack: 2, defense: 3, damage: 1, ai: 'AGGRESSIVE' },
    },
    {
      enemyRef: 'guardian',
      name: 'Guardián de piedra',
      count: 2,
      description: 'Se protege antes de atacar.',
      profile: { maxHealth: 8, attack: 3, defense: 6, damage: 1, ai: 'GUARDED' },
    },
  ],
  finalBoss: {
    enemyRef: 'guardian-eterno',
    name: 'Guardián eterno',
    heroType: 'GUERRERO_TANQUE',
    description: 'El último guardián del templo.',
    stats: { health: 60, attack: 8, defense: 7, damage: 3 },
    profile: {
      maxHealth: 60,
      attack: 8,
      defense: 7,
      damage: 3,
      ai: 'BOSS',
      enrageBelowPercent: 50,
      enrageAttackBonus: 2,
    },
    drops: [{ label: 'Reliquia', probability: 0.5, rolls: 1, productId: null }],
  },
  encounters: [
    { index: 1, kind: 'REGULAR', powerStep: 0, enemies: [{ enemyRef: 'sombra', count: 4 }] },
    { index: 2, kind: 'REGULAR', powerStep: 0.1, enemies: [{ enemyRef: 'guardian', count: 2 }] },
    {
      index: 3,
      kind: 'BOSS',
      powerStep: 0.2,
      enemies: [{ enemyRef: 'guardian-eterno', count: 1 }],
    },
  ],
  combatRules: DEFAULT_RULES,
  masterEncounter: {
    evaluationPoints: [{ afterEncounter: 2 }],
    maxAppearances: 1,
    candidates: [
      {
        masterRef: 'maestro-de-armas',
        name: 'Maestro de armas',
        subtype: 'GUERRERO_ARMAS',
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
          epicRef: 'segundo-impulso',
          name: 'Segundo impulso',
          generalEffect: 'Todos los héroes recuperan 1d4 de vida.',
          epicEffect: 'Solo Guerrero Armas: +3 a la vida y +5 % de crítico.',
          productId: null,
        },
      },
    ],
  },
  rewards: {
    guaranteed: [{ label: 'Experiencia' }],
    potential: [{ label: 'Reliquia', probability: 0.5, rolls: 1 }],
    objectiveBonuses: [],
    firstTime: [],
  },
  highlightedRewards: [{ label: 'Reliquia' }],
  active: true,
})
