import { useReducer, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

import type { CombatControls } from '@/features/battle-rooms/battle/AttackPanel'
import {
  attackIntentReducer,
  initialAttackIntentState,
} from '@/features/battle-rooms/battle/attackIntent'
import { battleReducer, initialBattleState } from '@/features/battle-rooms/battle/battleReducer'
import { BattleScreen } from '@/features/battle-rooms/battle/BattleScreen'
import {
  ANA,
  battle,
  basicAttackResolved,
  BRUNO,
  entry,
  MISS,
  RESOLUTION,
  ROOM_ID,
  withCombatants,
  type HealthByPosition,
} from '@/features/battle-rooms/battle/fixtures'
import { combatantHealth } from '@/features/battle-rooms/battle/presentation'
import type {
  BasicAttackResolution,
  BattleEventMessage,
  BattleView,
  SnapshotMessage,
  TargetRef,
  TurnOrderEntry,
} from '@/features/battle-rooms/battle/types'
import type { RealtimeConnectionState } from '../realtime'

/**
 * Vista previa de desarrollo de la pantalla de batalla (HU-17, HU-18).
 *
 * NO ES UNA PANTALLA DEL PRODUCTO y NO ES EVIDENCIA E2E: no hay Combat detras. Sirve para
 * revisar el diseno (320 px, foco, contraste, movimiento reducido) sin levantar el stack.
 * MONTA LOS COMPONENTES Y LOS REDUCTORES DE PRODUCCION, no copias: los eventos de este
 * recorrido tienen la forma exacta del contrato v1 y pasan por el mismo `battleReducer` y el
 * mismo `attackIntentReducer` que usa la pantalla real; el boton «Ataque básico» es el del
 * producto.
 *
 * El bloque «Servidor simulado (vista previa)» hace las veces de COMBAT (en produccion decide
 * el resultado, el dano, la Vida y el turno): aqui unas cuantas respuestas guionizadas para ver
 * cada estado. El cliente real nunca calcula nada de eso: solo aplica lo que le llega.
 *
 * Solo se alcanza con `import.meta.env.DEV` (ver `src/routes/dev-routes.tsx`) y sus marcadores
 * estan vetados del bundle productivo (`build:verify`).
 */
type Mode = '1v1' | '2v2' | '3v3' | 'ia'
type Perspective = 'sujeto-ana' | 'sujeto-bruno'

const ORDERS: Readonly<Record<Mode, readonly TurnOrderEntry[]>> = {
  '1v1': [entry(0), entry(1)],
  '2v2': [
    entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bruno', playerId: 'sujeto-bruno' }),
    entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: 'sujeto-ana' }),
    entry(2, {
      teamLabel: 'B',
      seat: 1,
      displayName: 'Carla',
      playerId: 'sujeto-carla',
      heroSubtype: 'MEDICO',
    }),
    entry(3, {
      teamLabel: 'A',
      seat: 1,
      displayName: 'Diego',
      playerId: 'sujeto-diego',
      heroSubtype: 'GUERRERO_TANQUE',
    }),
  ],
  '3v3': [
    entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bruno', playerId: 'sujeto-bruno' }),
    entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: 'sujeto-ana' }),
    entry(2, {
      teamLabel: 'B',
      seat: 1,
      displayName: 'Carla',
      playerId: 'sujeto-carla',
      heroSubtype: 'MEDICO',
    }),
    entry(3, {
      teamLabel: 'A',
      seat: 1,
      displayName: 'Diego',
      playerId: 'sujeto-diego',
      heroSubtype: 'GUERRERO_TANQUE',
    }),
    entry(4, {
      teamLabel: 'B',
      seat: 2,
      displayName: 'Elena',
      playerId: 'sujeto-elena',
      heroSubtype: 'MAGO_HIELO',
    }),
    entry(5, {
      teamLabel: 'A',
      seat: 2,
      displayName: 'Felipe',
      playerId: 'sujeto-felipe',
      heroSubtype: 'CHAMAN',
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

/** Vida inicial por posicion de la cola: `[actual, maxima]`, `null` sin perfil (la IA no tiene). */
const STARTING_HEALTH: Readonly<Record<Mode, HealthByPosition>> = {
  '1v1': [
    [44, 44],
    [44, 44],
  ],
  '2v2': [
    [44, 44],
    [44, 44],
    [30, 30],
    [52, 52],
  ],
  '3v3': [
    [44, 44],
    [44, 44],
    [30, 30],
    [52, 52],
    [36, 36],
    [40, 40],
  ],
  ia: [null, [44, 44]],
}

const OCCURRED_AT = '2026-01-01T00:00:00.000Z'

/** La vista de la batalla en un punto: con Vida (HU-18) o como la publicaba Combat antes de HU-18. */
const viewOf = (
  mode: Mode,
  turnsCompleted: number,
  health: HealthByPosition | null,
): BattleView => {
  const view = battle(turnsCompleted, ORDERS[mode])

  return health === null ? view : withCombatants(view, health)
}

const startSnapshot = (mode: Mode, health: HealthByPosition | null): SnapshotMessage => ({
  type: 'snapshot',
  roomId: ROOM_ID,
  seq: 1,
  status: 'IN_BATTLE',
  battle: viewOf(mode, 0, health),
})

const advancedEvent = (
  mode: Mode,
  turnsCompleted: number,
  seq: number,
  health: HealthByPosition | null,
): BattleEventMessage => ({
  type: 'turnAdvanced',
  seq,
  roomId: ROOM_ID,
  occurredAt: OCCURRED_AT,
  completedPosition: (turnsCompleted - 1) % ORDERS[mode].length,
  battle: viewOf(mode, turnsCompleted, health),
})

/** La Vida de la vista actual, en el mismo orden que la cola. */
const healthOfView = (view: BattleView): HealthByPosition =>
  view.turnOrder.map((member) => {
    const health = combatantHealth(view, member)

    return health === null ? null : ([health.current, health.max] as const)
  })

type Reply = 'critical' | 'miss' | 'noDamage'

const REPLIES: Readonly<Record<Reply, { label: string; resolution: BasicAttackResolution }>> = {
  critical: { label: 'Responde: golpe crítico (137 %, 6 de daño)', resolution: RESOLUTION },
  miss: { label: 'Responde: sin efecto (Ataque = Defensa)', resolution: MISS },
  noDamage: {
    label: 'Responde: «no causa daño» (0 %)',
    resolution: {
      ...RESOLUTION,
      effect: 'NO_DAMAGE',
      percent: 0,
      baseDamage: null,
      calculatedDamage: 0,
      appliedDamage: 0,
    },
  },
}

const CONNECTIONS: readonly { readonly value: RealtimeConnectionState; readonly label: string }[] =
  [
    { value: 'open', label: 'Conexión abierta' },
    { value: 'reconnecting', label: 'Reconectando' },
    { value: 'failed', label: 'Autenticación fallida' },
  ]

export const BattleScreenDevPreview = (): React.JSX.Element => {
  const [mode, setMode] = useState<Mode>('1v1')
  const [legacy, setLegacy] = useState(false)
  const [perspective, setPerspective] = useState<Perspective>('sujeto-ana')
  const [connection, setConnection] = useState<RealtimeConnectionState>('open')
  const [commandCount, setCommandCount] = useState(0)
  const [state, dispatch] = useReducer(battleReducer, initialBattleState, (initial) =>
    battleReducer(initial, {
      type: 'snapshot',
      message: startSnapshot('1v1', STARTING_HEALTH['1v1']),
    }),
  )
  const [attack, attackDispatch] = useReducer(attackIntentReducer, initialAttackIntentState)

  const restart = (next: Mode, withoutHealth = legacy): void => {
    setMode(next)
    dispatch({
      type: 'snapshot',
      message: startSnapshot(next, withoutHealth ? null : STARTING_HEALTH[next]),
    })
    attackDispatch({ type: 'dismissed' })
  }

  /** «Envia» el ataque: aqui solo queda pendiente; el servidor simulado lo responde a mano. */
  const onAttack = (target: TargetRef): void => {
    if (attack.intent !== null) {
      return
    }

    const next = commandCount + 1

    setCommandCount(next)
    attackDispatch({
      type: 'sent',
      intent: { commandId: `vista-previa-${String(next)}`, target },
    })
  }

  const controls: CombatControls = {
    attack,
    onAttack,
    onRetry: () => {
      attackDispatch({ type: 'retried' })
    },
    onDismissRejection: () => {
      attackDispatch({ type: 'dismissed' })
    },
  }

  /** El SERVIDOR SIMULADO resuelve la intencion pendiente y publica el evento del contrato. */
  const reply = (kind: Reply): void => {
    const view = state.battle
    const { intent } = attack

    if (view === null || intent === null) {
      return
    }

    const before = combatantHealth(view, intent.target)?.current ?? 0
    const { resolution } = REPLIES[kind]
    const applied = Math.min(resolution.appliedDamage, before)
    const after = before - applied
    const health = healthOfView(view).map((value, index) => {
      const member = view.turnOrder[index]

      return member?.teamLabel === intent.target.teamLabel &&
        member.seat === intent.target.seat &&
        value !== null
        ? ([after, value[1]] as const)
        : value
    })

    dispatch({
      type: 'event',
      message: basicAttackResolved({
        seq: state.lastSeq + 1,
        commandId: intent.commandId,
        attacker: { teamLabel: view.currentTurn.teamLabel, seat: view.currentTurn.seat },
        target: intent.target,
        resolution: { ...resolution, appliedDamage: applied },
        before,
        after,
        completedPosition: view.currentTurn.position,
        view: viewOf(mode, view.turnsCompleted + 1, health),
      }) as unknown as BattleEventMessage,
    })
    attackDispatch({ type: 'resolved', commandId: intent.commandId })
  }

  const setHealthOf = (position: number, current: number): void => {
    const view = state.battle

    if (view === null || legacy) {
      return
    }

    const health = healthOfView(view).map((value, index) =>
      index === position && value !== null ? ([current, value[1]] as const) : value,
    )

    dispatch({
      type: 'snapshot',
      message: {
        type: 'snapshot',
        roomId: ROOM_ID,
        seq: state.lastSeq + 1,
        status: 'IN_BATTLE',
        battle: viewOf(mode, view.turnsCompleted, health),
      },
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:px-6">
      {/*
       * CONTROLES DE DESARROLLO: herramientas de esta vista previa, NO parte del producto.
       * Van en un panel plegable con borde discontinuo para que, al plegarlo, una captura de la
       * pantalla de batalla no los muestre ni parezcan formar parte del juego.
       */}
      <details
        open
        className="rounded-xl border-2 border-dashed border-warning bg-surface p-3 sm:p-4"
      >
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Controles de desarrollo — no forman parte del producto
        </summary>
        <div className="mt-3 flex flex-col gap-4">
          <header>
            <h1 className="text-xl font-semibold text-ink">
              Vista previa de la batalla (HU-17, HU-18)
            </h1>
            <p className="mt-1 text-sm text-muted">
              Vista de desarrollo: no hay Combat detrás (no es evidencia de extremo a extremo). Los
              eventos pasan por los reductores reales. Pliega este panel para capturar solo la
              pantalla de batalla.
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
                      state.battle === null || legacy ? null : healthOfView(state.battle),
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
              {(['1v1', '2v2', '3v3', 'ia'] as const).map((option) => (
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
                    if (option.value !== 'open') {
                      attackDispatch({ type: 'connectionLost' })
                    }
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </fieldset>

            <fieldset className="mt-4 flex flex-wrap gap-2">
              <legend className="mb-1 text-xs font-medium text-muted">
                Vida (desde el servidor)
              </legend>
              <Button
                variant="secondary"
                onClick={() => {
                  setHealthOf(1, 22)
                }}
              >
                Ana 22/44 (amarillo)
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setHealthOf(1, 12)
                }}
              >
                Ana 12/44 (rojo)
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setHealthOf(0, 0)
                }}
              >
                Rival sin Vida
              </Button>
              <Button
                variant={legacy ? 'primary' : 'secondary'}
                aria-pressed={legacy}
                onClick={() => {
                  setLegacy(!legacy)
                  restart(mode, !legacy)
                }}
              >
                Batalla anterior a HU-18
              </Button>
            </fieldset>
          </Card>

          <Card
            title="Servidor simulado (vista previa)"
            description="Responde al ataque pendiente como lo haría Combat. Primero pulsa «Ataque básico»."
          >
            <div className="flex flex-wrap gap-2">
              {(Object.keys(REPLIES) as Reply[]).map((kind) => (
                <Button
                  key={kind}
                  variant="secondary"
                  onClick={() => {
                    reply(kind)
                  }}
                >
                  {REPLIES[kind].label}
                </Button>
              ))}
              <Button
                variant="secondary"
                onClick={() => {
                  attackDispatch({
                    type: 'rejected',
                    code: 'NOT_YOUR_TURN',
                    ...(attack.intent === null ? {} : { commandId: attack.intent.commandId }),
                  })
                }}
              >
                Rechaza: NOT_YOUR_TURN
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  attackDispatch({
                    type: 'rejected',
                    code: 'COMMAND_CONFLICT',
                    ...(attack.intent === null ? {} : { commandId: attack.intent.commandId }),
                  })
                }}
              >
                Pide reintentar: COMMAND_CONFLICT
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted">
              Ataque pendiente:{' '}
              {attack.intent === null
                ? 'ninguno'
                : `sí (${attack.intent.target.teamLabel}/${String(attack.intent.target.seat)})`}
              . Atacantes de referencia: Bruno {BRUNO.teamLabel}/{BRUNO.seat}, Ana {ANA.teamLabel}/
              {ANA.seat}.
            </p>
          </Card>
        </div>
      </details>

      {/* PANTALLA DE BATALLA: el componente de produccion, con el mismo contenedor que la app. */}
      <main aria-label="Pantalla de batalla (componente de producción)" className="w-full">
        {state.battle !== null && (
          <BattleScreen
            battle={state.battle}
            subject={perspective}
            connection={connection}
            synced={connection === 'open'}
            lastAttack={state.lastAttack}
            combat={controls}
          />
        )}
      </main>
    </div>
  )
}
