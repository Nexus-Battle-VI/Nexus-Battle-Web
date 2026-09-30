import { useEffect, useReducer, useRef, useState } from 'react'

import { useTheme } from '@/shared/theme'
import type { CombatControls } from '@/features/battle-rooms/battle/AttackPanel'
import {
  attackIntentReducer,
  initialAttackIntentState,
} from '@/features/battle-rooms/battle/attackIntent'
import { createServerClock, monotonicNow } from '@/features/battle-rooms/battle/battleClock'
import { battleReducer, initialBattleState } from '@/features/battle-rooms/battle/battleReducer'
import { BattleScreen } from '@/features/battle-rooms/battle/BattleScreen'
import {
  basicAttackResolved,
  entry,
  RESOLUTION,
  ROOM_ID,
} from '@/features/battle-rooms/battle/fixtures'
import { combatantHealth } from '@/features/battle-rooms/battle/presentation'
import {
  initialSkillIntentState,
  skillIntentReducer,
} from '@/features/battle-rooms/battle/skillIntent'
import type {
  BattleEventMessage,
  BattleResult,
  BattleView,
  CombatantView,
  SkillView,
  TargetRef,
  TurnOrderEntry,
} from '@/features/battle-rooms/battle/types'

/**
 * Vista previa de desarrollo del REMASTER VISUAL de "Jugar Online" — batalla
 * (Sprint 3, pantalla 3 del informe de auditoria).
 *
 * 2a pasada (correccion de composicion), seccion 28 del brief: el fixture por
 * defecto DEBE ser una batalla MODERNA activa (Vida, Poder, habilidades,
 * temporizadores) -- la 1a pasada montaba una vista SIN `combatants` ("batalla
 * anterior a HU-18"), que es exactamente el caso "legacy" que el brief pide
 * evitar como default.
 *
 * Complementa a `BattleScreenDevPreview` (HU-17/HU-18, ya existente): esa
 * vista cubre en profundidad turnos/ataques/conexion; ESTA agrega lo que
 * faltaba para validar el remaster sin backend: alternar tema Light/Dark y
 * los estados de FIN de batalla (victoria/derrota/empate) con su overlay de
 * resultado, recompensa y apuesta -- monta `BattleScreen`, el componente de
 * produccion, con el mismo `battleReducer` real y `fetch` interceptado para
 * `/reward`, `/rooms/:id` (apuesta) y `/wallet/me`.
 *
 * NO ES UNA PANTALLA DEL PRODUCTO y NO ES EVIDENCIA E2E.
 */
const SUBJECT = 'sujeto-ana'

/** 7a pasada (secciones 67-68 del brief): esta preview antes SOLO tenia
    2v2 fijo -- no habia forma de revisar 1v1/3v3 aqui (si existia un
    selector de formato, pero en la OTRA preview, `BattleScreenDevPreview`).
    Mismo patron de fixture (`entry`), solo con distinta cantidad de
    posiciones por equipo. */
type Format = '1v1' | '2v2' | '3v3'

const ORDER_1V1 = [
  entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bruno', playerId: 'sujeto-bruno' }),
  entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: SUBJECT }),
]

const ORDER_2V2 = [
  entry(0, { teamLabel: 'B', seat: 0, displayName: 'Bruno', playerId: 'sujeto-bruno' }),
  entry(1, { teamLabel: 'A', seat: 0, displayName: 'Ana', playerId: SUBJECT }),
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
]

const ORDER_3V3 = [
  ...ORDER_2V2,
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
    displayName: 'Fer',
    playerId: 'sujeto-fer',
    heroSubtype: 'CHAMAN',
  }),
]

const ORDERS: Readonly<Record<Format, readonly TurnOrderEntry[]>> = {
  '1v1': ORDER_1V1,
  '2v2': ORDER_2V2,
  '3v3': ORDER_3V3,
}

/** Vida/Poder por posicion, en el MISMO orden que `ORDERS[formato]`. Bruno
    (posicion 0) queda deliberadamente danado (40/44) para variedad visual;
    el resto a Vida llena. */
const STATS: Readonly<
  Record<Format, readonly { health: number; maxHealth: number; power: number }[]>
> = {
  '1v1': [
    { health: 40, maxHealth: 44, power: 4 },
    { health: 38, maxHealth: 44, power: 6 },
  ],
  '2v2': [
    { health: 40, maxHealth: 44, power: 4 },
    { health: 38, maxHealth: 44, power: 6 },
    { health: 30, maxHealth: 30, power: 8 },
    { health: 52, maxHealth: 52, power: 2 },
  ],
  '3v3': [
    { health: 40, maxHealth: 44, power: 4 },
    { health: 38, maxHealth: 44, power: 6 },
    { health: 30, maxHealth: 30, power: 8 },
    { health: 52, maxHealth: 52, power: 2 },
    { health: 36, maxHealth: 36, power: 5 },
    { health: 44, maxHealth: 44, power: 3 },
  ],
}

type SkillScenario = 'ready' | 'cooldown' | 'lowPower'

/** Las habilidades de Ana (sujeto): 2 reales + una 3a SOLO en DEV (seccion
    35/68 del brief: el contrato/fixture real solo trae 2, se agrega una
    tercera EXCLUSIVAMENTE aqui para revisar el layout de 4 slots -- nunca
    en produccion, nunca en backend). */
const anaSkills = (scenario: SkillScenario, withThird: boolean): readonly SkillView[] => [
  {
    abilityId: 'habilidad-escudo',
    name: 'Golpe con Escudo',
    powerCost: { mode: 'FIXED', amount: 3 },
    chargeTurns: 2,
    cooldownRemaining: 0,
    targetAudience: 'OPPONENT',
    status: 'READY',
  },
  {
    abilityId: 'habilidad-furia',
    name: 'Furia de Batalla',
    powerCost: { mode: 'FIXED', amount: 6 },
    chargeTurns: 3,
    cooldownRemaining: scenario === 'cooldown' ? 2 : 0,
    targetAudience: 'OPPONENT',
    status: scenario === 'cooldown' ? 'RECHARGING' : 'READY',
  },
  ...(withThird
    ? [
        {
          abilityId: 'dev-habilidad-reanimacion',
          name: 'Reanimación (DEV)',
          powerCost: { mode: 'FIXED' as const, amount: 4 },
          chargeTurns: 2,
          cooldownRemaining: 0,
          targetAudience: 'ALLY' as const,
          status: 'READY' as const,
        },
      ]
    : []),
]

/** Batalla ACTIVA moderna (1v1/2v2/3v3): Vida, Poder y habilidades reales. */
const activeBattle = (
  format: Format,
  turnsCompleted: number,
  anaPower: number,
  anaHealth: number,
  skillScenario: SkillScenario,
  withThirdSkill: boolean,
): BattleView => {
  const order = ORDERS[format]
  const currentTurn = order[turnsCompleted % order.length]

  if (currentTurn === undefined) {
    throw new Error('La cola de turnos del fixture no puede estar vacia.')
  }

  const combatants: readonly CombatantView[] = STATS[format].map((stat, index) => {
    const member = order[index]

    if (member === undefined) {
      throw new Error('El fixture de stats no coincide con la cola de turnos.')
    }

    const isAna = member.playerId === SUBJECT

    return {
      teamLabel: member.teamLabel,
      seat: member.seat,
      health: { current: isAna ? anaHealth : stat.health, max: isAna ? 44 : stat.maxHealth },
      power: {
        current: isAna ? (skillScenario === 'lowPower' ? 1 : anaPower) : stat.power,
        max: 10,
      },
      ...(isAna ? { skills: anaSkills(skillScenario, withThirdSkill) } : {}),
    }
  })

  const now = Date.now()

  return {
    battleId: ROOM_ID,
    startedAt: new Date(now - 60_000).toISOString(),
    turnOrder: order,
    turnsCompleted,
    round: Math.floor(turnsCompleted / order.length) + 1,
    currentTurn,
    combatants,
    deadlines: {
      turnEndsAt: new Date(now + 28_000).toISOString(),
      battleEndsAt: new Date(now + 320_000).toISOString(),
    },
  }
}

const winResult = (outcome: 'won' | 'lost' | 'draw'): BattleResult => ({
  reason: 'ELIMINATION',
  outcome: outcome === 'draw' ? 'NO_WINNER' : 'WIN',
  winnerTeamLabel: outcome === 'won' ? 'A' : outcome === 'lost' ? 'B' : null,
  finishedAt: '2026-09-21T10:20:00.000Z',
  tiebreak: null,
  disconnected: null,
  teams: [
    {
      teamLabel: 'A',
      remainingHealth: outcome === 'lost' ? 0 : 44,
      maxHealth: 44,
      lifePercent: outcome === 'lost' ? 0 : 100,
      eliminated: outcome === 'lost',
    },
    {
      teamLabel: 'B',
      remainingHealth: outcome === 'won' ? 0 : 30,
      maxHealth: 44,
      lifePercent: outcome === 'won' ? 0 : 68,
      eliminated: outcome === 'won',
    },
  ],
  participants: [
    {
      teamLabel: 'A',
      seat: 0,
      kind: 'HUMAN',
      playerId: SUBJECT,
      displayName: 'Ana',
      heroId: 'heroe-1',
      result: outcome === 'won' ? 'WON' : outcome === 'lost' ? 'LOST' : 'NO_WINNER',
    },
    {
      teamLabel: 'B',
      seat: 0,
      kind: 'HUMAN',
      playerId: 'sujeto-bruno',
      displayName: 'Bruno',
      heroId: 'heroe-0',
      result: outcome === 'won' ? 'LOST' : outcome === 'lost' ? 'WON' : 'NO_WINNER',
    },
  ],
})

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

type RewardScenario = 'first-win' | 'chest-earned' | 'weekly-limit' | 'failed'

const rewardBodyOf = (scenario: RewardScenario): unknown => {
  switch (scenario) {
    case 'chest-earned':
      return {
        creditsEarned: 2,
        balance: 132,
        victoryProgress: 0,
        weeklyChestCount: 1,
        chestEarned: true,
        rewardDelivery: 'CONFIRMED',
        reward: null,
      }
    case 'weekly-limit':
      return {
        creditsEarned: 2,
        balance: 140,
        victoryProgress: 14,
        weeklyChestCount: 2,
        chestEarned: false,
        rewardDelivery: 'CONFIRMED',
        reward: null,
      }
    case 'failed':
      return {
        creditsEarned: 2,
        balance: null,
        victoryProgress: 12,
        weeklyChestCount: 0,
        chestEarned: false,
        rewardDelivery: 'FAILED',
        reward: null,
      }
    case 'first-win':
    default:
      return {
        creditsEarned: 2,
        balance: 42,
        victoryProgress: 12,
        weeklyChestCount: 0,
        chestEarned: false,
        rewardDelivery: 'CONFIRMED',
        reward: null,
      }
  }
}

export const BattleRemasterPreview = (): React.JSX.Element => {
  const [rewardScenario, setRewardScenario] = useState<RewardScenario>('first-win')
  const [skillScenario, setSkillScenario] = useState<SkillScenario>('ready')
  const [anaHealth, setAnaHealth] = useState(38)
  const [format, setFormat] = useState<Format>('2v2')
  const [withThirdSkill, setWithThirdSkill] = useState(false)
  const [state, dispatch] = useReducer(battleReducer, initialBattleState, (initial) =>
    battleReducer(initial, {
      type: 'snapshot',
      message: {
        type: 'snapshot',
        roomId: ROOM_ID,
        seq: 1,
        status: 'IN_BATTLE',
        battle: activeBattle('2v2', 0, 6, anaHealth, skillScenario, false),
      },
    }),
  )
  const [attack, attackDispatch] = useReducer(attackIntentReducer, initialAttackIntentState)
  const [skill, skillDispatch] = useReducer(skillIntentReducer, initialSkillIntentState)
  const [result, setResult] = useState<BattleResult | null>(null)
  // Mismo criterio que `LobbyRemasterPreview`/`RoomRemasterPreview`: leer el
  // escenario por ref permite instalar el parche de `fetch` UNA sola vez.
  const rewardScenarioRef = useRef(rewardScenario)
  useEffect(() => {
    rewardScenarioRef.current = rewardScenario
  }, [rewardScenario])

  useEffect(() => {
    dispatch({
      type: 'snapshot',
      message: {
        type: 'snapshot',
        roomId: ROOM_ID,
        seq: state.lastSeq + 1,
        status: 'IN_BATTLE',
        battle: activeBattle(
          format,
          state.battle?.turnsCompleted ?? 0,
          6,
          anaHealth,
          skillScenario,
          withThirdSkill,
        ),
      },
    })
    // Solo cuando cambian los controles DEV (formato / escenario de habilidad / Vida / 3a
    // habilidad): no cuando avanza el turno por su cuenta, para no pisar lo que ya dibujo
    // `dispatch` de un evento real.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [format, skillScenario, anaHealth, withThirdSkill])

  useEffect(() => {
    const original = globalThis.fetch

    const patched = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = new URL(
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url,
        globalThis.location.origin,
      )

      if (url.pathname.endsWith('/reward')) {
        return Promise.resolve(jsonResponse(rewardBodyOf(rewardScenarioRef.current)))
      }
      if (url.pathname.endsWith('/v1/wallet/me')) {
        return Promise.resolve(jsonResponse({ balance: 132, weeklyChestLimit: 2, threshold: 20 }))
      }
      if (/\/v1\/combat\/rooms\/[^/]+$/u.test(url.pathname)) {
        return Promise.resolve(
          jsonResponse({
            id: ROOM_ID,
            mode: 'PVP',
            status: 'FINISHED',
            teams: [
              {
                label: 'A',
                capacity: 2,
                participants: [
                  {
                    kind: 'HUMAN',
                    playerId: SUBJECT,
                    heroId: 'heroe-1',
                    joinedAt: '2026-09-21T09:55:00.000Z',
                    displayName: 'Ana',
                    stake: { amount: 20, status: 'SETTLED_WON' },
                  },
                ],
              },
              { label: 'B', capacity: 2, participants: [] },
            ],
            reward: { amount: 4 },
            createdBy: SUBJECT,
            createdAt: '2026-09-21T09:55:00.000Z',
            version: 5,
          }),
        )
      }

      return original(input, init)
    }

    globalThis.fetch = patched

    return () => {
      if (globalThis.fetch === patched) {
        globalThis.fetch = original
      }
    }
  }, [])

  const controls: CombatControls = {
    attack,
    onAttack: (target: TargetRef) => {
      if (attack.intent === null) {
        attackDispatch({
          type: 'sent',
          intent: { commandId: 'vista-previa-remaster', target },
        })
      }
    },
    onRetry: () => {
      attackDispatch({ type: 'retried' })
    },
    onDismissRejection: () => {
      attackDispatch({ type: 'dismissed' })
    },
    // 6a pasada (secciones 39, 44-45, 113 del brief): SkillList solo se
    // monta cuando `combat.onUseSkill` existe (ver `AttackPanel.tsx`) --
    // sin esto, las 3 habilidades del fixture nunca se veian en esta
    // preview, aunque los datos ya existian. Mismo `skillIntentReducer`
    // real que usa la pantalla de produccion (`SkillList.tsx`), no una
    // funcion simulada propia.
    skill,
    onUseSkill: (abilityId, target) => {
      if (skill.intent === null) {
        skillDispatch({
          type: 'sent',
          intent: { commandId: 'vista-previa-remaster-skill', abilityId, target },
        })
      }
    },
    onRetrySkill: () => {
      skillDispatch({ type: 'retried' })
    },
    onDismissSkillRejection: () => {
      skillDispatch({ type: 'dismissed' })
    },
  }

  // 6a pasada (secciones 46-53, 96-97 del brief): resuelve la intencion de
  // ataque PENDIENTE con la forma real de `basicAttackResolved` (contrato
  // v1, mismo helper `basicAttackResolved` de fixtures que usa
  // `BattleScreenDevPreview`), pasada por el reductor real -- demuestra que
  // el Combat Log (`describeLatestAction`, en `BattleScreen.tsx`) y la
  // barra de Vida SI se alimentan de un evento real, contra CUALQUIER
  // objetivo (no solo Ana): nada se recalcula aqui, solo se construye el
  // evento que Combat publicaria.
  const resolveAttack = (): void => {
    const view = state.battle
    const { intent } = attack

    if (view === null || intent === null) {
      return
    }

    const targetHealth = combatantHealth(view, intent.target)
    const before = targetHealth?.current ?? 0
    const applied = Math.min(RESOLUTION.appliedDamage, before)
    const after = before - applied
    const nextTurnsCompleted = view.turnsCompleted + 1
    const nextCurrentTurn =
      view.turnOrder[nextTurnsCompleted % view.turnOrder.length] ?? view.currentTurn
    const nextView: BattleView = {
      ...view,
      turnsCompleted: nextTurnsCompleted,
      round: Math.floor(nextTurnsCompleted / view.turnOrder.length) + 1,
      currentTurn: nextCurrentTurn,
      combatants: (view.combatants ?? []).map((combatant) =>
        combatant.teamLabel === intent.target.teamLabel &&
        combatant.seat === intent.target.seat &&
        combatant.health !== null
          ? { ...combatant, health: { ...combatant.health, current: after } }
          : combatant,
      ),
    }

    dispatch({
      type: 'event',
      message: basicAttackResolved({
        seq: state.lastSeq + 1,
        commandId: intent.commandId,
        attacker: { teamLabel: view.currentTurn.teamLabel, seat: view.currentTurn.seat },
        target: intent.target,
        resolution: RESOLUTION,
        before,
        after,
        completedPosition: view.currentTurn.position,
        view: nextView,
      }) as unknown as BattleEventMessage,
    })
    attackDispatch({ type: 'resolved', commandId: intent.commandId })
  }

  // 6a pasada (seccion 39/111/115 del brief): "Mi turno" DEV-only -- mismo
  // patron que `BattleScreenDevPreview` (`advancedEvent`/"Simular
  // turnAdvanced"): un evento con la FORMA REAL de `turnAdvanced` (contrato
  // v1), pasado por el MISMO `battleReducer` de produccion. No es un estado
  // inventado aparte: es el reductor real reaccionando a un evento con la
  // forma que Combat publicaria.
  const advanceTurn = (): void => {
    const turnsCompleted = (state.battle?.turnsCompleted ?? 0) + 1
    const order = ORDERS[format]
    const nextBattle = activeBattle(
      format,
      turnsCompleted,
      6,
      anaHealth,
      skillScenario,
      withThirdSkill,
    )

    dispatch({
      type: 'event',
      message: {
        type: 'turnAdvanced',
        seq: state.lastSeq + 1,
        roomId: ROOM_ID,
        occurredAt: new Date().toISOString(),
        completedPosition: order[(turnsCompleted - 1) % order.length]?.position ?? 0,
        battle: nextBattle,
      } as BattleEventMessage,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-4 sm:px-6">
      <details
        open
        className="rounded-xl border-2 border-dashed border-warning bg-surface p-3 sm:p-4"
      >
        <summary className="cursor-pointer text-sm font-semibold text-ink">
          Controles de desarrollo — no forman parte del producto
        </summary>
        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-muted">
            Vista previa del remaster visual de la batalla: batalla ACTIVA moderna por defecto
            (Vida, Poder, habilidades, temporizadores). No hay Combat detras: no es evidencia E2E.
            Complementa `__dev/hu17/battle` (turnos/ataques a fondo) con tema y fin de batalla.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded border border-border px-2 py-1 text-sm"
              onClick={() => {
                useTheme.getState().toggleTheme()
              }}
            >
              Alternar tema (Light/Dark)
            </button>
            {/* 6a pasada (secciones 39/111/115 del brief): antes esta preview
                SIEMPRE arrancaba y se quedaba en "Turno de Bruno" -- no
                existia ningun control para avanzar el turno aqui (si existia
                en `BattleScreenDevPreview`, una preview distinta). Mismo
                evento `turnAdvanced` real de esa otra preview. */}
            <button
              type="button"
              className="rounded border border-border px-2 py-1 text-sm"
              onClick={advanceTurn}
            >
              Simular turnAdvanced (Mi turno)
            </button>
            {/* 6a pasada (secciones 46-53, 96-97 del brief): visible solo con
                un ataque pendiente (tras pulsar "Ataque básico" real, en su
                turno, contra un objetivo). */}
            <button
              type="button"
              className="rounded border border-border px-2 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={attack.intent === null}
              onClick={resolveAttack}
            >
              Responde: golpe crítico (Combat Log + Vida)
            </button>
            <button
              type="button"
              className="rounded border border-border px-2 py-1 text-sm"
              onClick={() => {
                setResult(null)
              }}
            >
              Volver a batalla activa
            </button>
            <button
              type="button"
              className="rounded bg-success px-2 py-1 text-sm text-white"
              onClick={() => {
                setResult(winResult('won'))
              }}
            >
              Finalizar: Victoria
            </button>
            <button
              type="button"
              className="rounded bg-danger px-2 py-1 text-sm text-white"
              onClick={() => {
                setResult(winResult('lost'))
              }}
            >
              Finalizar: Derrota
            </button>
            <button
              type="button"
              className="rounded bg-warning px-2 py-1 text-sm text-white"
              onClick={() => {
                setResult(winResult('draw'))
              }}
            >
              Finalizar: Sin ganador
            </button>
          </div>

          {/* 7a pasada (seccion 67 del brief): antes esta preview era 2v2
              FIJO -- no habia forma de revisar 1v1/3v3 aqui. Mismo
              `battleReducer`/fixture real, solo cambia cuantas posiciones
              trae la cola de turnos. */}
          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-xs font-medium text-muted">Formato</legend>
            {(['1v1', '2v2', '3v3'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded px-2 py-1 text-xs ${format === option ? 'bg-brand text-white' : 'border border-border'}`}
                onClick={() => {
                  setFormat(option)
                }}
              >
                {option}
              </button>
            ))}
          </fieldset>

          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-xs font-medium text-muted">
              Habilidades de Ana (sujeto)
            </legend>
            {/* 7a pasada (seccion 35/68 del brief): el contrato/fixture real
                solo trae 2 habilidades -- esta 3a es EXCLUSIVA de esta
                preview (nunca produccion/backend) para revisar los 4 slots
                completos (Basico + 3). */}
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={withThirdSkill}
                onChange={(event) => {
                  setWithThirdSkill(event.target.checked)
                }}
              />
              3a habilidad (DEV, para probar 4 slots)
            </label>
            {(['ready', 'cooldown', 'lowPower'] as const).map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded px-2 py-1 text-xs ${skillScenario === option ? 'bg-brand text-white' : 'border border-border'}`}
                onClick={() => {
                  setSkillScenario(option)
                }}
              >
                {option === 'ready'
                  ? 'disponibles'
                  : option === 'cooldown'
                    ? 'una en recarga'
                    : 'Poder insuficiente'}
              </button>
            ))}
          </fieldset>

          <fieldset className="flex flex-wrap gap-2">
            <legend className="mb-1 text-xs font-medium text-muted">Vida de Ana (sujeto)</legend>
            {[44, 22, 8].map((value) => (
              <button
                key={value}
                type="button"
                className={`rounded px-2 py-1 text-xs ${anaHealth === value ? 'bg-brand text-white' : 'border border-border'}`}
                onClick={() => {
                  setAnaHealth(value)
                }}
              >
                {value}/44
              </button>
            ))}
          </fieldset>

          {result !== null && (
            <fieldset className="flex flex-wrap gap-2">
              <legend className="mb-1 text-xs font-medium text-muted">
                Escenario de recompensa (`/reward`)
              </legend>
              {(['first-win', 'chest-earned', 'weekly-limit', 'failed'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`rounded px-2 py-1 text-xs ${rewardScenario === option ? 'bg-brand text-white' : 'border border-border'}`}
                  onClick={() => {
                    setRewardScenario(option)
                  }}
                >
                  {option}
                </button>
              ))}
            </fieldset>
          )}
        </div>
      </details>

      <main aria-label="Pantalla de batalla (componente de producción)" className="w-full">
        {state.battle !== null && (
          <BattleScreen
            battle={state.battle}
            subject={SUBJECT}
            connection="open"
            synced
            lastAttack={state.lastAttack}
            lastSkill={state.lastSkill}
            lastHealSkill={state.lastHealSkill}
            combat={controls}
            result={result}
            serverClock={createServerClock(new Date().toISOString(), monotonicNow())}
          />
        )}
      </main>
    </div>
  )
}
