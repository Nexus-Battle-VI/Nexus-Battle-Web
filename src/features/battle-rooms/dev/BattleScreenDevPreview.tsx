import { useReducer, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import { BattleScreen } from '@/features/battle-rooms/battle/BattleScreen'
import { battleReducer, initialBattleState } from '@/features/battle-rooms/battle/battleReducer'
import { battle, entry, ROOM_ID } from '@/features/battle-rooms/battle/fixtures'
import type {
  BattleEventMessage,
  SnapshotMessage,
  TurnOrderEntry,
} from '@/features/battle-rooms/battle/types'
import type { RealtimeConnectionState } from '../realtime'

/**
 * Vista previa de desarrollo de la pantalla de batalla (HU-17).
 *
 * NO ES UNA PANTALLA DEL PRODUCTO y NO ES EVIDENCIA E2E: no hay Combat detras.
 * Sirve para revisar el diseno (320 px, foco, contraste, movimiento reducido) sin
 * levantar el stack. MONTA EL COMPONENTE Y EL REDUCTOR DE PRODUCCION, no copias:
 * los eventos de este recorrido tienen la forma exacta del contrato v1 y pasan por
 * el mismo `battleReducer` que usa la pantalla real.
 *
 * "Simular turnAdvanced" hace las veces del SERVIDOR (en produccion lo publica
 * Combat). El cliente real nunca calcula el turno: solo aplica lo que le llega.
 *
 * Solo se alcanza con `import.meta.env.DEV` (ver `src/routes/dev-routes.tsx`).
 */
type Mode = '1v1' | '2v2' | 'ia'
type Perspective = 'sujeto-ana' | 'sujeto-bruno'

const ORDERS: Readonly<Record<Mode, readonly TurnOrderEntry[]>> = {
  '1v1': [entry(0), entry(1)],
  '2v2': [
    entry(0, { teamLabel: 'B', displayName: 'Bruno', playerId: 'sujeto-bruno' }),
    entry(1, { teamLabel: 'A', displayName: 'Ana', playerId: 'sujeto-ana' }),
    entry(2, {
      teamLabel: 'B',
      displayName: 'Carla',
      playerId: 'sujeto-carla',
      heroSubtype: 'MEDICO',
    }),
    entry(3, {
      teamLabel: 'A',
      displayName: 'Diego',
      playerId: 'sujeto-diego',
      heroSubtype: 'GUERRERO_TANQUE',
    }),
  ],
  ia: [
    entry(0, {
      kind: 'AI',
      teamLabel: 'B',
      playerId: null,
      displayName: null,
      heroId: null,
      heroSubtype: null,
    }),
    entry(1),
  ],
}

const OCCURRED_AT = '2026-01-01T00:00:00.000Z'

const startSnapshot = (mode: Mode): SnapshotMessage => ({
  type: 'snapshot',
  roomId: ROOM_ID,
  seq: 1,
  status: 'IN_BATTLE',
  battle: battle(0, ORDERS[mode]),
})

const advancedEvent = (mode: Mode, turnsCompleted: number, seq: number): BattleEventMessage => ({
  type: 'turnAdvanced',
  seq,
  roomId: ROOM_ID,
  occurredAt: OCCURRED_AT,
  completedPosition: (turnsCompleted - 1) % ORDERS[mode].length,
  battle: battle(turnsCompleted, ORDERS[mode]),
})

const CONNECTIONS: readonly { readonly value: RealtimeConnectionState; readonly label: string }[] =
  [
    { value: 'open', label: 'Conexión abierta' },
    { value: 'reconnecting', label: 'Reconectando' },
    { value: 'failed', label: 'Autenticación fallida' },
  ]

export const BattleScreenDevPreview = (): React.JSX.Element => {
  const [mode, setMode] = useState<Mode>('1v1')
  const [perspective, setPerspective] = useState<Perspective>('sujeto-ana')
  const [connection, setConnection] = useState<RealtimeConnectionState>('open')
  const [state, dispatch] = useReducer(battleReducer, initialBattleState, (initial) =>
    battleReducer(initial, { type: 'snapshot', message: startSnapshot('1v1') }),
  )

  const restart = (next: Mode): void => {
    setMode(next)
    dispatch({ type: 'snapshot', message: startSnapshot(next) })
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Vista previa de la batalla (HU-17)</h1>
        <p className="mt-1 text-sm text-muted">
          Vista de desarrollo: no hay Combat detrás. Los eventos pasan por el reductor real.
        </p>
      </header>

      <Card title="Controles" description="Simulan lo que en producción publica el servidor.">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => {
              dispatch({
                type: 'event',
                message: advancedEvent(
                  mode,
                  (state.battle?.turnsCompleted ?? 0) + 1,
                  state.lastSeq + 1,
                ),
              })
            }}
          >
            Simular turnAdvanced
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              restart(mode)
            }}
          >
            Reiniciar
          </Button>
        </div>

        <fieldset className="mt-4 flex flex-wrap gap-2">
          <legend className="mb-1 text-xs font-medium text-muted">Formato</legend>
          {(['1v1', '2v2', 'ia'] as const).map((option) => (
            <Button
              key={option}
              variant={mode === option ? 'primary' : 'secondary'}
              aria-pressed={mode === option}
              onClick={() => {
                restart(option)
              }}
            >
              {option === 'ia' ? '1 vs IA' : option}
            </Button>
          ))}
        </fieldset>

        <fieldset className="mt-4 flex flex-wrap gap-2">
          <legend className="mb-1 text-xs font-medium text-muted">Quién mira</legend>
          {(
            [
              ['sujeto-ana', 'Ana'],
              ['sujeto-bruno', 'Bruno'],
            ] as const
          ).map(([subject, label]) => (
            <Button
              key={subject}
              variant={perspective === subject ? 'primary' : 'secondary'}
              aria-pressed={perspective === subject}
              onClick={() => {
                setPerspective(subject)
              }}
            >
              {label}
            </Button>
          ))}
        </fieldset>

        <fieldset className="mt-4 flex flex-wrap gap-2">
          <legend className="mb-1 text-xs font-medium text-muted">Conexión</legend>
          {CONNECTIONS.map((option) => (
            <Button
              key={option.value}
              variant={connection === option.value ? 'primary' : 'secondary'}
              aria-pressed={connection === option.value}
              onClick={() => {
                setConnection(option.value)
              }}
            >
              {option.label}
            </Button>
          ))}
        </fieldset>
      </Card>

      {state.battle !== null && (
        <BattleScreen
          battle={state.battle}
          subject={perspective}
          connection={connection}
          synced={connection === 'open'}
        />
      )}
    </main>
  )
}
