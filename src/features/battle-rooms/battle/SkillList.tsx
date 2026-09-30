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
 * (Reanimacion) NO usa el objetivo rival del panel de ataque -- ofrece companeros (`healableAllies`,
 * sin filtrar por Vida: un aliado caido sigue siendo un objetivo valido; Combat, no este cliente,
 * decide si ese objetivo concreto es valido para ESTA habilidad). Con un unico companero no hay
 * nada que elegir, igual que el objetivo del ataque basico.
 *
 * Pasada final (secciones 23, 32-38, 63-64 del brief): con mas de un companero elegible, el selector
 * ya NO vive siempre visible dentro de la barra de acciones (eso desestabilizaba la altura de TODA
 * la barra, seccion 23-28) -- pulsar la habilidad abre un popover COMPACTO y aislado (fuera del
 * flujo de `.br-action-bar`); elegir companero ahi envia la intencion real y lo cierra; Cancelar lo
 * cierra sin enviar nada. El pending/feedback real no cambian: solo cambia CUANDO se pide el objetivo.
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
  const [onlyAlly] = allies
  const autoAlly = allies.length === 1 ? (onlyAlly ?? null) : null
  const [pickerAbilityId, setPickerAbilityId] = useState<string | null>(null)
  const pickerSkill = skills.find((entry) => entry.abilityId === pickerAbilityId) ?? null

  if (skills.length === 0) {
    return null
  }

  const closePicker = (): void => {
    setPickerAbilityId(null)
  }

  const chooseAllyTarget = (ally: TurnOrderEntry): void => {
    if (pickerAbilityId === null) {
      return
    }
    onUse(pickerAbilityId, { teamLabel: ally.teamLabel, seat: ally.seat })
    closePicker()
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
          const needsPicker = isHeal && allies.length > 1
          // Pasada final (secciones 23-28 del brief): mientras hay mas de un
          // companero, el boton solo ABRE el popover -- nunca se sabe el
          // objetivo antes de pulsar, asi que aqui se usa el primer aliado
          // SOLO para que `skillAvailability` no lo bloquee por falta de
          // objetivo (nunca se envia ese objetivo por si solo: el envio real
          // ocurre en `chooseAllyTarget`, con el aliado que el jugador elige
          // en el popover).
          const effectiveTarget = isHeal ? (needsPicker ? (allies[0] ?? null) : autoAlly) : target

          return (
            <SkillRow
              key={entry.abilityId}
              skill={entry}
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
                if (needsPicker) {
                  setPickerAbilityId(entry.abilityId)
                  return
                }
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

      {pickerSkill !== null && (
        <AllyTargetPicker
          skillName={pickerSkill.name}
          allies={allies}
          battle={battle}
          onChoose={chooseAllyTarget}
          onCancel={closePicker}
        />
      )}

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
  readonly availability: { readonly enabled: boolean; readonly hint: string | null }
  /** Esta es la habilidad enviada que espera resultado. */
  readonly busy: boolean
  /** Hay una intencion (de ataque o de habilidad) enviada sin resultado. */
  readonly pending: boolean
  readonly noteId: string
  /**
   * Pasada final (secciones 23-28, 32-33 del brief): para una habilidad de
   * curacion con mas de un companero, esto ABRE el popover (`AllyTargetPicker`,
   * fuera de la barra de acciones) -- nunca envia la intencion por si solo.
   * Para todo lo demas (ataque rival normal, o curacion con 0/1 companero
   * -- nada que elegir), sigue enviando la intencion real de inmediato.
   */
  readonly onUse: () => void
}

const SkillRow = ({
  skill,
  availability,
  busy,
  pending,
  noteId,
  onUse,
}: SkillRowProps): React.JSX.Element => {
  const hintId = useId()
  const stateId = useId()
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

interface AllyTargetPickerProps {
  readonly skillName: string
  readonly allies: readonly TurnOrderEntry[]
  readonly battle: BattleView
  readonly onChoose: (ally: TurnOrderEntry) => void
  readonly onCancel: () => void
}

/**
 * Pasada final (secciones 23, 32-38, 63-64 del brief): popover COMPACTO y
 * AISLADO -- vive fuera de `.br-action-bar` (overlay `position: fixed`, ver
 * `.br-ally-target-overlay` en battle-rooms.css) para que elegir companero
 * nunca reserve espacio permanente ni estire el resto de la barra. Solo
 * aparece tras pulsar una habilidad de curacion con mas de un companero
 * elegible (HU-12); elegir uno envia la intencion real de inmediato y cierra
 * el popover; Cancelar lo cierra sin enviar nada. `healableAllies` (ya
 * calculado por quien llama) decide la lista -- este componente solo la
 * presenta, nunca inventa ni filtra un candidato adicional.
 */
const AllyTargetPicker = ({
  skillName,
  allies,
  battle,
  onChoose,
  onCancel,
}: AllyTargetPickerProps): React.JSX.Element => {
  const headingId = useId()
  const { t } = useTranslation()

  return (
    <div
      className="br-ally-target-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel()
        }
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={headingId} className="br-panel p-4">
        <h4 id={headingId} className="mb-3 text-sm font-semibold text-ink">
          {t('battle:skills.chooseHealTarget', { skill: skillName })}
        </h4>
        <ul className="flex flex-col gap-2">
          {allies.map((ally) => {
            const health = combatantHealth(battle, ally)

            return (
              <li key={keyOf(ally)}>
                <Button
                  variant="battle-secondary"
                  className="min-h-11 w-full justify-between gap-3"
                  onClick={() => {
                    onChoose(ally)
                  }}
                >
                  <span className="min-w-0 truncate">{combatantName(ally)}</span>
                  <span className="text-xs tabular-nums text-muted">
                    {health === null
                      ? ''
                      : t('battle:health.value', {
                          current: String(health.current),
                          max: String(health.max),
                        })}
                  </span>
                </Button>
              </li>
            )
          })}
        </ul>
        <Button variant="battle-secondary" className="mt-3 min-h-11 w-full" onClick={onCancel}>
          {t('battle:cancel')}
        </Button>
      </div>
    </div>
  )
}
