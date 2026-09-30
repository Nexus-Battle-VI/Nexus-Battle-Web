import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/Button'
import type { RealtimeConnectionState } from '../realtime'

import '../battle-rooms.css'
import { BattlePixelIcon } from '../BattlePixelIcon'
import type { AttackIntentState } from './attackIntent'
import { SkillList } from './SkillList'
import { initialSkillIntentState, type SkillIntentState } from './skillIntent'
import { skillsVisible } from './skillPresentation'
import { attackableTargets, attackAvailability, describeAttackRejection } from './presentation'
import type { BattleView, TargetRef } from './types'

/** Lo que la pantalla necesita para atacar; lo aporta `useBattleRealtime`. */
export interface CombatControls {
  readonly attack: AttackIntentState
  /** Envia el ataque basico contra UN objetivo. */
  readonly onAttack: (target: TargetRef) => void
  /** Reenvia la intencion pendiente con el MISMO `commandId`. */
  readonly onRetry: () => void
  readonly onDismissRejection: () => void
  /**
   * HU-19 (opcional): la habilidad en curso y sus acciones. Sin `onUseSkill` no se ofrece ninguna
   * habilidad y la pantalla se comporta como en HU-18.
   */
  readonly skill?: SkillIntentState
  /** Envia `useSkill` con la habilidad y UN objetivo. */
  readonly onUseSkill?: (abilityId: string, target: TargetRef) => void
  /** Reenvia la habilidad pendiente con el MISMO `commandId`. */
  readonly onRetrySkill?: () => void
  readonly onDismissSkillRejection?: () => void
}

export interface AttackPanelProps {
  readonly battle: BattleView
  readonly subject: string | null
  readonly connection: RealtimeConnectionState
  readonly synced: boolean
  readonly combat: CombatControls
  /**
   * Objetivo CONTROLADO desde `BattleScreen` (remaster visual, 2a pasada):
   * el heroe rival se elige haciendo clic DIRECTO sobre el en la arena
   * (`BattleArena.tsx`) -- `BattleScreen` es quien lleva ese estado y lo
   * entrega aqui listo. 7a pasada (secciones 37-41 del brief): ya no existe
   * NINGUNA UI propia para elegir objetivo dentro de este panel (el radio
   * visible se quito); sin este prop (pruebas standalone), el unico
   * objetivo posible es el automatico de un unico rival con Vida.
   */
  readonly selectedTarget?: TargetRef | null
}

const keyOf = (ref: TargetRef): string => `${ref.teamLabel}#${String(ref.seat)}`

const noop = (): void => undefined

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
  selectedTarget,
}: AttackPanelProps): React.JSX.Element => {
  const headingId = useId()
  const hintId = useId()
  const { t } = useTranslation()
  const { attack } = combat
  const attackPending = attack.intent !== null
  // Una sola accion por turno: mientras una habilidad espera su resultado tampoco se ataca.
  const pending = attackPending || (combat.skill?.intent ?? null) !== null
  const ready = connection === 'open' && synced
  const controlled = selectedTarget !== undefined

  const targets = attackableTargets(battle, subject)
  // Con un unico rival con Vida no hay nada que elegir: es el objetivo. Con varios, solo
  // vale la eleccion que sigue siendo un objetivo valido (uno caido deja de serlo). Cuando
  // `BattleScreen` controla la seleccion (clic sobre el heroe en la arena), se usa esa misma.
  const [only] = targets
  const selectedKey = controlled
    ? selectedTarget !== null
      ? keyOf(selectedTarget)
      : null
    : targets.length === 1 && only !== undefined
      ? keyOf(only)
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

  // 8a pasada (secciones 41-43 del brief): "Elige un objetivo" (hint generico
  // del boton) y "Selecciona un objetivo en la arena" (esta linea) decian lo
  // MISMO a la vez -- queda SOLO esta, mas concreta (dice DONDE elegir); el
  // hint generico sigue existiendo para lectores de pantalla (`aria-describedby`)
  // pero deja de duplicarse a la vista.
  const chooseInArenaVisible = availability.visible && targets.length > 1 && selected === null

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      {/* El titulo existe para los lectores de pantalla; a la vista, la barra ya es evidente. */}
      <h2 id={headingId} className="sr-only">
        {t('battle:battle.actions')}
      </h2>

      {/*
       * 7a pasada (secciones 37-41 del brief): el selector visible de radios
       * ("○ Bruno Vida 40/44", "○ Carla Vida 30/30") se QUITA de la UI --
       * Richard lo senalo explicitamente como ruido sobre las acciones. El
       * objetivo se elige EXCLUSIVAMENTE haciendo clic sobre el heroe rival
       * en la arena (`BattleArena.tsx`, ya real desde la 2a pasada: mismo
       * `TargetRef`, mismo `chooseTarget`/`onSelectTarget`, MISMO estado --
       * no se crea ningun target state nuevo). Cuando hace falta elegir
       * (varios rivales, ninguno elegido todavia) queda SOLO esta linea
       * compacta, nunca una fila de chips. */}
      {chooseInArenaVisible && (
        <p className="text-center text-xs" style={{ color: 'var(--br-muted)' }}>
          {t('battle:attack.chooseInArena')}
        </p>
      )}

      {/*
       * La accion principal va primero, seguida por las habilidades (HU-19) en la MISMA fila --
       * juntas forman la barra de acciones (`.br-action-bar`) de la referencia visual. La epica
       * no tiene boton: no existe una epica activa real.
       */}
      {availability.visible && (
        <div className="br-action-bar">
          <Button
            variant="battle-primary"
            aria-disabled={!availability.enabled}
            aria-busy={attackPending}
            aria-describedby={availability.hint === null ? undefined : hintId}
            className="br-action-slot text-sm font-semibold aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:opacity-50"
            onClick={submit}
          >
            <BattlePixelIcon icon="attack" size="sm" />
            {attackPending ? t('battle:attack.attacking') : t('battle:attack.basic')}
          </Button>

          {combat.onUseSkill !== undefined && skillsVisible(battle, subject) && (
            <SkillList
              battle={battle}
              subject={subject}
              connection={connection}
              synced={synced}
              pending={pending}
              target={selected}
              skill={combat.skill ?? initialSkillIntentState}
              onUse={combat.onUseSkill}
              onRetry={combat.onRetrySkill ?? noop}
              onDismissRejection={combat.onDismissSkillRejection ?? noop}
            />
          )}
        </div>
      )}

      {/*
       * 8a pasada (secciones 36-40 del brief): el texto "la habilidad epica
       * llegara..." se quita de la vista -- es una nota tecnica sin
       * contraparte real (no hay ninguna epica activa), y no la describe
       * ningun control (`aria-describedby`), asi que no hace falta version
       * sr-only para accesibilidad.
       */}
      {/*
       * 9a pasada (secciones 33-36 del brief): "Esperando el resultado de tu
       * accion..." se repetia debajo de Ataque basico Y de cada habilidad a
       * la vez (mismo hint, `attack.hints.pending`, tanto aqui como en cada
       * `SkillRow` -- ver `SkillList.tsx`). El pending REAL sigue
       * bloqueando el boton (`aria-disabled`/`aria-busy`, sin tocar); solo
       * el TEXTO se oculta visualmente mientras `pending` es cierto, y
       * queda accesible via el mismo `aria-describedby` de siempre.
       */}
      {availability.hint !== null && (
        <p
          id={hintId}
          className={chooseInArenaVisible || pending ? 'sr-only' : 'text-xs'}
          style={chooseInArenaVisible || pending ? undefined : { color: 'var(--br-muted)' }}
        >
          {availability.hint}
        </p>
      )}

      {attack.unconfirmed && attack.intent !== null && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-danger">
          <p>{t('battle:attack.unconfirmed')}</p>
          <Button
            variant="battle-secondary"
            aria-disabled={!ready}
            className="min-h-11 aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
            onClick={() => {
              if (ready) {
                combat.onRetry()
              }
            }}
          >
            {t('battle:attack.retry')}
          </Button>
        </div>
      )}

      {attack.rejection !== null && (
        <div role="alert" className="flex flex-col items-start gap-2 text-sm text-danger">
          <p>{describeAttackRejection(attack.rejection)}</p>
          <Button
            variant="battle-secondary"
            className="min-h-11"
            onClick={combat.onDismissRejection}
          >
            {t('battle:understood')}
          </Button>
        </div>
      )}
    </section>
  )
}
