import { useId } from 'react'
import clsx from 'clsx'

import { Button } from '@/components/ui/Button'
import type { RealtimeConnectionState } from '../realtime'

import { findSelf } from './presentation'
import type { SkillIntentState } from './skillIntent'
import {
  combatantSkills,
  describePowerCost,
  describeRecharge,
  describeSkillRejection,
  describeSkillStatus,
  skillAvailability,
} from './skillPresentation'
import type { BattleView, SkillView, TargetRef } from './types'

export interface SkillListProps {
  readonly battle: BattleView
  readonly subject: string | null
  readonly connection: RealtimeConnectionState
  readonly synced: boolean
  /** Hay una intencion (de ataque o de habilidad) enviada sin resultado. */
  readonly pending: boolean
  /** El objetivo elegido en el panel de combate; `null` si todavia no hay uno. */
  readonly target: TargetRef | null
  readonly skill: SkillIntentState
  /** Envia `useSkill` con la habilidad y el objetivo. Combat decide todo lo demas. */
  readonly onUse: (abilityId: string, target: TargetRef) => void
  /** Reenvia la intencion pendiente con el MISMO `commandId`. */
  readonly onRetry: () => void
  readonly onDismissRejection: () => void
}

/**
 * Habilidades del heroe (HU-19, RF-19): la lista que Combat publica, con su costo, su recarga y su
 * estado. Solo comunica una INTENCION (cual habilidad y contra quien): el costo, el Poder que queda,
 * si la recarga termino, el resultado, el dano, la Vida y el turno los decide Combat.
 *
 * Todo lo importante es TEXTO (no solo color): el costo («2 de Poder»), la recarga y el estado
 * («Disponible», «En recarga: falta 1 turno», «Todavía no disponible»). El boton mantiene el foco
 * mientras espera (`aria-disabled`, no `disabled`) y la razon por la que no se puede usar es texto
 * visible enlazado con `aria-describedby`. Los rechazos se anuncian con `role="alert"`.
 *
 * Con Poder insuficiente la habilidad NO se bloquea aqui: HU-11 manda que Combat use un ataque basico
 * en ese turno, asi que la interfaz lo avisa (texto fijo) y deja que Combat decida.
 */
export const SkillList = ({
  battle,
  subject,
  connection,
  synced,
  pending,
  target,
  skill,
  onUse,
  onRetry,
  onDismissRejection,
}: SkillListProps): React.JSX.Element | null => {
  const headingId = useId()
  const noteId = useId()
  const self = findSelf(battle, subject)
  const skills = self === null ? [] : combatantSkills(battle, self)
  const using = skill.intent
  const ready = connection === 'open' && synced

  if (skills.length === 0) {
    return null
  }

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="text-xs font-semibold uppercase tracking-widest text-muted">
        Habilidades
      </h3>

      <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
        {skills.map((entry) => (
          <SkillRow
            key={entry.abilityId}
            skill={entry}
            availability={skillAvailability({ connection, synced, pending, target, skill: entry })}
            busy={using?.abilityId === entry.abilityId}
            noteId={noteId}
            onUse={() => {
              if (target !== null) {
                onUse(entry.abilityId, { teamLabel: target.teamLabel, seat: target.seat })
              }
            }}
          />
        ))}
      </ul>

      <p id={noteId} className="text-xs text-muted">
        El costo de Poder y la recarga los aplica Combat. Si tu Poder no alcanza, se usa un ataque
        básico en su lugar y la habilidad no se gasta.
      </p>

      {skill.unconfirmed && skill.intent !== null && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-danger">
          <p>
            No se pudo confirmar tu habilidad. Es posible que Combat ya la haya procesado: al
            reintentar se envía el mismo comando y no se duplica.
          </p>
          <Button
            variant="secondary"
            aria-disabled={!ready}
            className="min-h-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            onClick={() => {
              if (ready) {
                onRetry()
              }
            }}
          >
            Reintentar habilidad
          </Button>
        </div>
      )}

      {skill.rejection !== null && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-danger">
          <p>{describeSkillRejection(skill.rejection)}</p>
          <Button variant="secondary" className="min-h-11" onClick={onDismissRejection}>
            Entendido
          </Button>
        </div>
      )}
    </section>
  )
}

interface SkillRowProps {
  readonly skill: SkillView
  readonly availability: { readonly enabled: boolean; readonly hint: string | null }
  /** Esta es la habilidad enviada que espera resultado. */
  readonly busy: boolean
  readonly noteId: string
  readonly onUse: () => void
}

const SkillRow = ({
  skill,
  availability,
  busy,
  noteId,
  onUse,
}: SkillRowProps): React.JSX.Element => {
  const hintId = useId()
  const stateId = useId()

  return (
    <li
      className={clsx(
        'flex min-w-0 flex-col gap-2 rounded-lg border p-3',
        skill.status === 'READY' ? 'border-border' : 'border-border/60 bg-surface/50',
      )}
    >
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2">
        <span className="min-w-0 truncate text-sm font-semibold text-ink">{skill.name}</span>
        <span className="text-xs tabular-nums text-muted">
          {describePowerCost(skill.powerCost)}
        </span>
      </div>
      <p id={stateId} className="text-xs text-muted">
        {describeSkillStatus(skill)} · {describeRecharge(skill.chargeTurns)}
      </p>
      <Button
        aria-disabled={!availability.enabled}
        aria-busy={busy}
        aria-describedby={`${stateId} ${availability.hint === null ? noteId : hintId}`}
        className="min-h-11 w-full text-sm font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:opacity-50"
        onClick={() => {
          if (availability.enabled) {
            onUse()
          }
        }}
      >
        {busy ? 'Usando…' : `Usar ${skill.name}`}
      </Button>
      {availability.hint !== null && (
        <p id={hintId} className="text-xs text-muted">
          {availability.hint}
        </p>
      )}
    </li>
  )
}
