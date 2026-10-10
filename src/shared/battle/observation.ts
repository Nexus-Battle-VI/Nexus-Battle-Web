import type { ComponentType } from 'react'

/** Datos visibles de Combat. La composición de rutas conecta las vistas de las features. */
export interface ArenaObservation {
  readonly combatRoomId: string
  readonly startedAt: string
  readonly status: 'IN_PROGRESS' | 'FINISHED'
  readonly battleRound: number
  readonly turnsCompleted: number
  readonly currentPlayerId: string
  readonly teams: readonly { readonly teamLabel: string; readonly name: string }[]
  readonly combatants: readonly {
    readonly teamLabel: string
    readonly seat: number
    readonly playerId: string
    readonly heroId: string
    readonly heroSubtype: string | null
    readonly displayName: string | null
    readonly position: number
    readonly health: { readonly current: number; readonly max: number } | null
    readonly power: { readonly current: number; readonly max: number } | null
  }[]
}

export interface SpectatorArenaProps {
  readonly observation: ArenaObservation
  readonly connected: boolean
}

export type SpectatorArenaRenderer = ComponentType<SpectatorArenaProps>
