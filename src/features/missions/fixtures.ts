import type { MissionReport, MissionReportRewardLine } from './api'

/**
 * Datos de las pruebas de la feature `missions` (HU-74 y HU-09.5). No es una
 * suite: Vitest solo toma `*.test.ts(x)`.
 */
export const ENROLLMENT_ID = 'enr_3b9f6c1e-8d2a-4f7b-9c4e-5a6b7c8d9e0f'

export const lineOf = (
  overrides: Partial<MissionReportRewardLine> = {},
): MissionReportRewardLine => ({
  kind: 'EXPERIENCE',
  reference: 'sombra-corrompida#1',
  name: 'Sombra Corrompida',
  rarity: null,
  quantity: 0,
  status: 'PENDING',
  source: 'HU-09',
  ...overrides,
})

/**
 * Un informe del contrato `hu-74-mission-report-v1` con lo mínimo que la pantalla
 * mira. `experience` se omite cuando no se pasa, que es justo el caso de un
 * servicio anterior a HU-09.5.
 */
export const reportOf = (
  overrides: {
    readonly experience?: MissionReport['experience']
    readonly rewards?: readonly MissionReportRewardLine[]
    readonly difficulty?: string
    readonly outcome?: string
  } = {},
): MissionReport => ({
  schemaVersion: 1,
  enrollmentId: ENROLLMENT_ID,
  mission: {
    missionId: 'msn_templo_olvidado',
    name: 'El Templo Olvidado',
    category: 'STORY',
    difficulty: overrides.difficulty ?? 'NORMAL',
  },
  summary: {
    outcome: overrides.outcome ?? 'COMPLETED',
    outcomeReason: null,
    hero: { heroId: 'hero-01', name: 'Kael', subtype: 'GUERRERO' },
    startedAt: '2026-10-02T03:00:00.000Z',
    finishedAt: '2026-10-02T15:00:00.000Z',
    simulatedDuration: 'PT12H',
  },
  rewards: overrides.rewards ?? [],
  ...(overrides.experience === undefined ? {} : { experience: overrides.experience }),
  generatedAt: '2026-10-02T15:00:05.000Z',
})
