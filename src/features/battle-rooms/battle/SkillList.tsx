import { useId, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import type { RealtimeConnectionState } from '../realtime'

import '../battle-rooms.css'
import { BattlePixelIcon } from '../BattlePixelIcon'
import { combatantHealth, combatantName, findSelf, healableAllies } from './presentation'
import type { SkillIntentState } from './skillIntent'
import {
  combatantSkills,
  describePowerCost,
  describeRecharge,
  describeSkillRejection,
  describeSkillStatus,
  skillAvailability,
} from './skillPresentation'
import type { BattleView, SkillView, TargetRef, TurnOrderEntry } from './types'

const keyOf = (ref: TargetRef): string => `${ref.teamLabel}#${String(ref.seat)}`

export interface SkillListProps {
  readonly battle: BattleView
  readonly subject: string | null
  readonly connection: RealtimeConnectionState
  readonly synced: boolean
  /** Hay una intencion (de ataque o de habilidad) enviada sin resultado. */
  readonly pending: boolean
  /** El objetivo elegido en el panel de combate (rival); `null` si todavia no hay uno. */
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
 *
 * EXCEPCION DE CURACION (HU-12, sin Task de Management): una habilidad con `targetAudience: 'ALLY'`
 * (Reanimacion) NO usa el objetivo rival del panel de ataque -- ofrece su PROPIO selector de
 * companero (`healableAllies`, sin filtrar por Vida: un aliado caido sigue siendo un objetivo
 * valido). Con un unico companero no hay nada que elegir, igual que el objetivo del ataque basico.
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
  const { t } = useTranslation()
  const self = findSelf(battle, subject)
  const skills = self === null ? [] : combatantSkills(battle, self)
  const using = skill.intent
  const ready = connection === 'open' && synced
  const allies = healableAllies(battle, subject)
  const [chosenAlly, setChosenAlly] = useState<string | null>(null)
  const [onlyAlly] = allies
  const selectedAllyKey =
    allies.length === 1 && onlyAlly !== undefined
      ? keyOf(onlyAlly)
      : allies.some((entry) => keyOf(entry) === chosenAlly)
        ? chosenAlly
        : null
  const selectedAlly = allies.find((entry) => keyOf(entry) === selectedAllyKey) ?? null

  if (skills.length === 0) {
    return null
  }

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-1 flex-col gap-2">
      {/* Remaster visual Sprint 3 (3a pasada): el titulo visible desaparece --
          las habilidades ahora se leen como parte de la MISMA barra de
          acciones que "Ataque básico" (ver `AttackPanel`), no como una
          seccion propia con su encabezado. Sigue existiendo para lectores de
          pantalla. */}
      <h3 id={headingId} className="sr-only">
        {t('battle:skills.title')}
      </h3>

      {/* 4a pasada (seccion 53, 112 del brief): SIEMPRE `flex-wrap`, nunca
          `overflow-x-auto` -- un scroll horizontal en la barra de acciones
          esta prohibido; con muchas habilidades, la fila envuelve. */}
      <ul className="flex min-w-0 flex-row flex-wrap gap-2">
        {skills.map((entry) => {
          const isHeal = entry.targetAudience === 'ALLY'
          const effectiveTarget = isHeal ? selectedAlly : target

          return (
            <SkillRow
              key={entry.abilityId}
              skill={entry}
              battle={battle}
              allies={allies}
              selectedAllyKey={selectedAllyKey}
              onChooseAlly={setChosenAlly}
              availability={skillAvailability({
                connection,
                synced,
                pending,
                target: effectiveTarget,
                skill: entry,
              })}
              busy={using?.abilityId === entry.abilityId}
              pending={pending}
              noteId={noteId}
              onUse={() => {
                if (effectiveTarget !== null) {
                  onUse(entry.abilityId, {
                    teamLabel: effectiveTarget.teamLabel,
                    seat: effectiveTarget.seat,
                  })
                }
              }}
            />
          )
        })}
      </ul>

      {/* 8a pasada (secciones 36-40 del brief): el texto "el costo de Poder y
          la recarga los aplica Combat..." se quita de la vista -- sigue
          existiendo para lectores de pantalla porque un boton SIN otra pista
          (`availability.hint === null`) lo usa como `aria-describedby`
          (ver `noteId` en `SkillRow`). */}
      <p id={noteId} className="sr-only">
        {t('battle:skills.note')}
      </p>

      {skill.unconfirmed && skill.intent !== null && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-danger">
          <p>{t('battle:skills.unconfirmed')}</p>
          <Button
            variant="battle-secondary"
            aria-disabled={!ready}
            className="min-h-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            onClick={() => {
              if (ready) {
                onRetry()
              }
            }}
          >
            {t('battle:skills.retry')}
          </Button>
        </div>
      )}

      {skill.rejection !== null && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-danger">
          <p>{describeSkillRejection(skill.rejection)}</p>
          <Button variant="battle-secondary" className="min-h-11" onClick={onDismissRejection}>
            {t('battle:understood')}
          </Button>
        </div>
      )}
    </section>
  )
}

interface SkillRowProps {
  readonly skill: SkillView
  readonly battle: BattleView
  /** Companeros elegibles para una habilidad de curacion (`targetAudience: 'ALLY'`). */
  readonly allies: readonly TurnOrderEntry[]
  readonly selectedAllyKey: string | null
  readonly onChooseAlly: (key: string) => void
  readonly availability: { readonly enabled: boolean; readonly hint: string | null }
  /** Esta es la habilidad enviada que espera resultado. */
  readonly busy: boolean
  /** Hay una intencion (de ataque o de habilidad) enviada sin resultado. */
  readonly pending: boolean
  readonly noteId: string
  readonly onUse: () => void
}

const SkillRow = ({
  skill,
  battle,
  allies,
  selectedAllyKey,
  onChooseAlly,
  availability,
  busy,
  pending,
  noteId,
  onUse,
}: SkillRowProps): React.JSX.Element => {
  const hintId = useId()
  const stateId = useId()
  const allyLegendId = useId()
  const isHeal = skill.targetAudience === 'ALLY'
  const { t } = useTranslation()

  return (
    <li
      className={clsx(
        'flex shrink-0 flex-col items-center gap-1',
        skill.status !== 'READY' && 'opacity-70',
      )}
    >
      {/* 7a pasada (secciones 31-33 del brief): el slot entero ES el boton
          (mismo lenguaje que "Ataque básico" en `.br-action-slot`) -- ya no
          hay una tarjeta grande + un boton "Usar X" adentro. El estado
          ("En recarga: 2 turnos"...) ya NO se repite aqui SIEMPRE: solo
          aparece cuando de verdad importa, via `availability.hint`
          (identico criterio al de Ataque básico). */}
      <Button
        variant="battle-primary"
        aria-disabled={!availability.enabled}
        aria-busy={busy}
        aria-label={busy ? t('battle:skills.using') : t('battle:skills.use', { skill: skill.name })}
        aria-describedby={`${stateId} ${availability.hint === null ? noteId : hintId}`}
        className="br-action-slot text-xs font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:opacity-50"
        onClick={() => {
          if (availability.enabled) {
            onUse()
          }
        }}
      >
        <BattlePixelIcon icon="skill" size="sm" className="h-4 w-auto shrink-0" />
        <span className="w-full min-w-0 truncate">{skill.name}</span>
        <span className="br-action-slot-cost">{describePowerCost(skill.powerCost)}</span>
      </Button>
      {/* Texto completo del estado: sr-only cuando la habilidad SI esta lista
          (info util pero no urgente), visible y pequeño cuando no lo esta
          (misma info que antes, solo deja de ocupar espacio siempre). */}
      <p
        id={stateId}
        className={clsx('text-center text-[10px]', skill.status === 'READY' && 'sr-only')}
        style={{ color: 'var(--br-muted)' }}
      >
        {describeSkillStatus(skill)} · {describeRecharge(skill.chargeTurns)}
      </p>

      {isHeal && allies.length > 1 && (
        <fieldset className="min-w-0">
          <legend id={allyLegendId} className="mb-1 text-xs font-semibold text-muted">
            {t('battle:skills.healTarget')}
          </legend>
          <div className="flex flex-wrap gap-2">
            {allies.map((entry) => {
              const key = keyOf(entry)
              const health = combatantHealth(battle, entry)

              return (
                <label
                  key={key}
                  data-selected={key === selectedAllyKey}
                  className={clsx(
                    'br-target-chip flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2',
                    'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand',
                    key === selectedAllyKey ? 'border-brand bg-brand/10' : 'border-border',
                  )}
                >
                  <input
                    type="radio"
                    name={`${allyLegendId}-companero`}
                    value={key}
                    checked={key === selectedAllyKey}
                    onChange={() => {
                      onChooseAlly(key)
                    }}
                    className="size-4 accent-brand"
                  />
                  <span className="min-w-0 truncate text-sm font-medium text-ink">
                    {combatantName(entry)}
                  </span>
                  <span className="text-xs tabular-nums text-muted">
                    {health === null
                      ? ''
                      : t('battle:health.value', {
                          current: String(health.current),
                          max: String(health.max),
                        })}
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
      )}

      {/* 9a pasada (secciones 33-36 del brief): mientras `pending` es cierto
          este hint es SIEMPRE "Esperando el resultado de tu accion..."
          (`attack.hints.pending`, mismo texto que `AttackPanel`) -- se
          repetia debajo de CADA habilidad a la vez. El boton sigue
          bloqueado de verdad (`aria-disabled` arriba, sin tocar); solo el
          texto se oculta visualmente, y sigue accesible via
          `aria-describedby`. */}
      {availability.hint !== null && (
        <p id={hintId} className={pending ? 'sr-only' : 'text-xs text-muted'}>
          {availability.hint}
        </p>
      )}
    </li>
  )
}
