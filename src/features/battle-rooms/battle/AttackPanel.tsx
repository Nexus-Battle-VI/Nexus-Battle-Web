import { useId, useState } from 'react'
import clsx from 'clsx'

import { Button } from '@/components/ui/Button'
import type { RealtimeConnectionState } from '../realtime'

import type { AttackIntentState } from './attackIntent'
import {
  attackableTargets,
  attackAvailability,
  combatantHealth,
  combatantName,
  describeAttackRejection,
} from './presentation'
import type { BattleView, TargetRef } from './types'

/** Lo que la pantalla necesita para atacar; lo aporta `useBattleRealtime`. */
export interface CombatControls {
  readonly attack: AttackIntentState
  /** Envia el ataque basico contra UN objetivo. */
  readonly onAttack: (target: TargetRef) => void
  /** Reenvia la intencion pendiente con el MISMO `commandId`. */
  readonly onRetry: () => void
  readonly onDismissRejection: () => void
}

export interface AttackPanelProps {
  readonly battle: BattleView
  readonly subject: string | null
  readonly connection: RealtimeConnectionState
  readonly synced: boolean
  readonly combat: CombatControls
}

const keyOf = (ref: TargetRef): string => `${ref.teamLabel}#${String(ref.seat)}`

/**
 * Acciones de combate (HU-18): elegir UN objetivo y pulsar «Ataque básico».
 *
 * Solo comunica una INTENCION (a quien atacar): el resultado, el dano, la Vida y el turno
 * los decide Combat. El boton solo se ofrece en tu turno y se habilita con un objetivo con
 * Vida, la conexion lista y sin otro ataque en curso. NO depende del Poder (RF-18).
 *
 * Accesibilidad: el objetivo es un grupo de opciones nativo (`radio`) con su leyenda, el
 * boton mantiene el foco mientras espera (`aria-disabled`, no `disabled`) y la razon por la
 * que no se puede atacar es TEXTO visible enlazado con `aria-describedby`, no solo un
 * tooltip. Los rechazos del servidor se anuncian con `role="alert"`.
 */
export const AttackPanel = ({
  battle,
  subject,
  connection,
  synced,
  combat,
}: AttackPanelProps): React.JSX.Element => {
  const headingId = useId()
  const hintId = useId()
  const [chosen, setChosen] = useState<string | null>(null)
  const { attack } = combat
  const pending = attack.intent !== null
  const ready = connection === 'open' && synced

  const targets = attackableTargets(battle, subject)
  // Con un unico rival con Vida no hay nada que elegir: es el objetivo. Con varios, solo
  // vale la eleccion que sigue siendo un objetivo valido (uno caido deja de serlo).
  const [only] = targets
  const selectedKey =
    targets.length === 1 && only !== undefined
      ? keyOf(only)
      : targets.some((entry) => keyOf(entry) === chosen)
        ? chosen
        : null
  const selected = targets.find((entry) => keyOf(entry) === selectedKey) ?? null

  const availability = attackAvailability({
    battle,
    subject,
    connection,
    synced,
    pending,
    target: selected,
  })

  const submit = (): void => {
    if (availability.enabled && selected !== null) {
      combat.onAttack({ teamLabel: selected.teamLabel, seat: selected.seat })
    }
  }

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-3 rounded-xl border border-border bg-surface-raised p-3 sm:p-4"
    >
      {/* El titulo existe para los lectores de pantalla; a la vista, la barra ya es evidente. */}
      <h2 id={headingId} className="sr-only">
        Acciones de combate
      </h2>

      {/*
       * La accion principal va primero y las demas (habilidades y epica, HU-19) podran
       * sumarse como hermanas de este bloque sin tocar el resto. Hoy no hay botones falsos.
       */}
      {availability.visible && (
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-6">
          <fieldset className="min-w-0 flex-1">
            <legend className="mb-1.5 text-xs font-semibold uppercase tracking-widest text-muted">
              Objetivo del ataque
            </legend>
            <div className="flex flex-wrap gap-2">
              {targets.map((entry) => {
                const health = combatantHealth(battle, entry)
                const key = keyOf(entry)

                return (
                  <label
                    key={key}
                    className={clsx(
                      'flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2',
                      'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand',
                      key === selectedKey ? 'border-brand bg-brand/10' : 'border-border',
                    )}
                  >
                    <input
                      type="radio"
                      name={`${headingId}-objetivo`}
                      value={key}
                      checked={key === selectedKey}
                      disabled={pending}
                      onChange={() => {
                        setChosen(key)
                      }}
                      className="size-4 accent-brand"
                    />
                    <span className="min-w-0 truncate text-sm font-medium text-ink">
                      {combatantName(entry)}
                    </span>
                    <span className="text-xs tabular-nums text-muted">
                      {health === null
                        ? ''
                        : `Vida ${String(health.current)} / ${String(health.max)}`}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <Button
            aria-disabled={!availability.enabled}
            aria-busy={pending}
            aria-describedby={availability.hint === null ? undefined : hintId}
            className="min-h-12 w-full px-8 text-base font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:opacity-50 md:w-auto md:min-w-52"
            onClick={submit}
          >
            {pending ? 'Atacando…' : 'Ataque básico'}
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {availability.hint !== null && (
          <p id={hintId} className="text-sm text-muted">
            {availability.hint}
          </p>
        )}
        <p className="text-xs text-muted">
          Las habilidades y la épica llegarán con las siguientes historias de Jugar Online.
        </p>
      </div>

      {attack.unconfirmed && attack.intent !== null && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-danger">
          <p>
            No se pudo confirmar tu ataque. Es posible que Combat ya lo haya procesado: al
            reintentar se envía el mismo comando y no se duplica.
          </p>
          <Button
            variant="secondary"
            aria-disabled={!ready}
            className="min-h-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            onClick={() => {
              if (ready) {
                combat.onRetry()
              }
            }}
          >
            Reintentar ataque
          </Button>
        </div>
      )}

      {attack.rejection !== null && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-danger">
          <p>{describeAttackRejection(attack.rejection)}</p>
          <Button variant="secondary" className="min-h-11" onClick={combat.onDismissRejection}>
            Entendido
          </Button>
        </div>
      )}
    </section>
  )
}
