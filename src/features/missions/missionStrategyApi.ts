import { httpClient, HttpError } from '@/lib/http'

export type RotationPriority = 'HIGH' | 'MEDIUM' | 'LOW'
export type RotationStep =
  { readonly kind: 'ABILITY'; readonly abilityId: string } | { readonly kind: 'BASIC_ATTACK' }

export interface Rotation {
  readonly priority: RotationPriority
  readonly steps: readonly RotationStep[]
}

export interface MissionStrategy {
  readonly missionId: string
  readonly heroId: string
  readonly version: number
  readonly rotations: readonly Rotation[]
  readonly updatedAt: string
}

const errorCode = (error: HttpError): unknown =>
  typeof error.body === 'object' && error.body !== null && 'code' in error.body
    ? error.body.code
    : null

/** Solo STRATEGY_NOT_FOUND representa la primera configuración; otros 404 son fallos. */
export const fetchMissionStrategy = async (
  missionId: string,
  heroId: string,
  signal?: AbortSignal,
): Promise<MissionStrategy | null> => {
  try {
    return await httpClient.get<MissionStrategy>(
      `/v1/missions/${encodeURIComponent(missionId)}/strategies/${encodeURIComponent(heroId)}`,
      signal,
    )
  } catch (error: unknown) {
    if (
      error instanceof HttpError &&
      error.status === 404 &&
      errorCode(error) === 'STRATEGY_NOT_FOUND'
    ) {
      return null
    }
    throw error
  }
}

export const saveMissionStrategy = (
  missionId: string,
  heroId: string,
  expectedVersion: number | null,
  rotations: readonly Rotation[],
): Promise<MissionStrategy> =>
  httpClient.request<MissionStrategy>(
    `/v1/missions/${encodeURIComponent(missionId)}/strategies/${encodeURIComponent(heroId)}`,
    { method: 'PUT', body: { expectedVersion, rotations } },
  )
