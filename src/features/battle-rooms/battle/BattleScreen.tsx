import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { useTranslation } from 'react-i18next'

import type { RealtimeConnectionState } from '../realtime'

import '../battle-rooms.css'
import { PowerMeter } from '../PowerMeter'
import { AttackPanel, type CombatControls } from './AttackPanel'
import { ArenaSide } from './BattleArena'
import { BattleResultView } from './BattleResultView'
import { HealthBar } from './HealthBar'
import { RewardPanel } from './RewardPanel'
import { StakePanel } from './StakePanel'
import { BattleTimers } from './BattleTimers'
import type { ServerClock } from './battleClock'
import type { LastAttack, LastHealSkill, LastSkill, LastTurnTimeout } from './battleReducer'
import {
  attackableTargets,
  combatantHealth,
  combatantName,
  describeTurn,
  findSelf,
  groupCombatants,
  hasCombatState,
  type ActionFeedback,
} from './presentation'
import { combatantPower, describeLatestAction } from './skillPresentation'
import type { BattleResult, BattleView, HealthView, TargetRef, TurnOrderEntry } from './types'

export interface BattleScreenProps {
  readonly battle: BattleView
  /** `sub` verificado de la sesion: solo sirve para decir "tu turno" y marcar "tú". */
  readonly subject: string | null
  readonly connection: RealtimeConnectionState
  /** `false` mientras se recupera el estado tras una reconexion. */
  readonly synced: boolean
  /** El ultimo ataque basico que publico el servidor (HU-18); `null` si aun no hubo ninguno. */
  readonly lastAttack?: LastAttack | null
  /** La ultima habilidad que publico el servidor (HU-19); `null` si aun no hubo ninguna. */
  readonly lastSkill?: LastSkill | null
  /**
   * La ultima curacion que publico el servidor (excepcion de HU-12, sin Task
   * de Management); `null` si aun no hubo ninguna.
   */
  readonly lastHealSkill?: LastHealSkill | null
  /**
   * Acciones de combate (HU-18). Sin ellas la pantalla es de solo lectura: se ve la Vida y
   * el turno, pero no se ofrece ningun boton.
   */
  readonly combat?: CombatControls
  /** HU-21: el resultado unico si la batalla termino; `null` mientras siga en curso. */
  readonly result?: BattleResult | null
  /** HU-21: el ultimo turno perdido por tiempo (franja de resultado). */
  readonly lastTurnTimeout?: LastTurnTimeout | null
  /** HU-21: reloj de visualizacion; sin el no se muestran cuentas atras. */
  readonly serverClock?: ServerClock | null
  /** Observación: nombres de ambos equipos y fin autoritativo, sin acciones ni premios propios. */
  readonly spectator?: {
    readonly ended: boolean
    readonly teamNames: Readonly<Record<string, string>>
  }
}

const keyOf = (ref: TargetRef): string => `${ref.teamLabel}#${String(ref.seat)}`

/**
 * 9a pasada (secciones 38-43 del brief): el feedback del ultimo ataque/
 * habilidad/curacion es TRANSITORIO -- aparece, se lee, desaparece solo.
 * Richard pidio "aproximadamente 2.5 a 3.5 segundos"; 3000ms es el punto
 * medio razonable.
 */
const COMBAT_FEEDBACK_VISIBLE_MS = 3000

/**
 * Pantalla de batalla (HU-17, HU-18) como una ARENA de videojuego (remaster visual Sprint 3,
 * 3a pasada, secciones 32-54 del brief): mi equipo SIEMPRE a la izquierda y el enemigo SIEMPRE a
 * la derecha (presentacion relativa al `subject`, vía `groupCombatants` -- `teamLabel` real
 * jamas se altera), con el campo de batalla como fondo dominante, HUD en las esquinas
 * superiores, el ultimo evento como registro flotante abajo-izquierda y las acciones reales en
 * una barra inferior. Solo LEE lo que publica Combat: no calcula turnos, no decide resultados ni
 * dano y no genera aleatoriedad.
 *
 * UN SOLO ARBOL DE DOM, con el orden logico de lectura: turno (anuncio) -> mi HUD -> Nexus Arena
 * (turno/ronda/orden/temporizadores) -> HUD del enemigo -> arena (mi equipo, VS, enemigo) ->
 * resultado -> ultima accion -> acciones. La posicion VISUAL de cada bloque (esquinas, flotante)
 * es CSS puro (`position: absolute` dentro de `.br-battle-stage`, que es `position: relative`),
 * nunca `order`: el foco de teclado y los lectores de pantalla siguen ese mismo orden del DOM.
 */
export const BattleScreen = ({
  battle,
  subject,
  connection,
  synced,
  lastAttack = null,
  lastSkill = null,
  lastHealSkill = null,
  combat,
  result = null,
  lastTurnTimeout = null,
  serverClock = null,
  spectator,
}: BattleScreenProps): React.JSX.Element => {
  const finished = result !== null || spectator?.ended === true
  const { t } = useTranslation()
  const turn = finished
    ? {
        isMyTurn: false,
        headline: t('battle:battle.finished'),
        detail: t('battle:battle.round', { round: String(battle.round) }),
      }
    : describeTurn(battle, subject)
  const self = findSelf(battle, subject)
  const { allies, opponents } = groupCombatants(battle, subject)
  const allyTitle = spectator?.teamNames[allies[0]?.teamLabel ?? ''] ?? t('battle:battle.yourTeam')
  const opponentTitle =
    spectator?.teamNames[opponents[0]?.teamLabel ?? ''] ?? t('battle:battle.rival')
  const isCurrent = (entry: TurnOrderEntry): boolean =>
    !finished && entry.position === battle.currentTurn.position
  const isSelf = (entry: TurnOrderEntry): boolean =>
    self !== null && entry.position === self.position
  const reconnecting = connection === 'reconnecting' || (connection === 'open' && !synced)
  const withHealth = hasCombatState(battle)
  const healthOf = (entry: TurnOrderEntry): HealthView | null | undefined =>
    withHealth ? combatantHealth(battle, entry) : undefined

  // Objetivo de ataque: estado UNICO, compartido entre el heroe rival (clic directo sobre la
  // arena) y el chip del `AttackPanel` -- seleccionar en cualquiera de los dos actualiza el
  // mismo estado, sin duplicar la regla de "quien es atacable" (`attackableTargets`, ya existente).
  const targets = attackableTargets(battle, subject)
  const [chosenKey, setChosenKey] = useState<string | null>(null)
  const [only] = targets
  const selectedKey =
    targets.length === 1 && only !== undefined
      ? keyOf(only)
      : targets.some((entry) => keyOf(entry) === chosenKey)
        ? chosenKey
        : null
  const selectedTarget = targets.find((entry) => keyOf(entry) === selectedKey) ?? null
  // Sin `combat` la pantalla es de solo lectura (HU-18): NINGUN boton se ofrece, tampoco el
  // clic sobre el heroe rival -- mismo criterio que el resto de la pantalla.
  const isTargetableEntry = (entry: TurnOrderEntry): boolean =>
    spectator === undefined &&
    combat !== undefined &&
    targets.some((candidate) => candidate.position === entry.position)
  const isTargetSelectedEntry = (entry: TurnOrderEntry): boolean =>
    selectedTarget !== null && entry.position === selectedTarget.position
  const onSelectTarget = (entry: TurnOrderEntry): void => {
    setChosenKey(keyOf({ teamLabel: entry.teamLabel, seat: entry.seat }))
  }

  // HUD de esquina (seccion 38-40 del brief): mi combatiente principal (yo, o el primero de mi
  // lado si no hay perfil propio -- p. ej. viendolo como espectador) y el foco del enemigo (el
  // objetivo elegido; si ninguno, quien tiene el turno; si ninguno, el primero). El resto de cada
  // lado se lista debajo, compacto -- MISMOS datos que la arena, solo agrupados para el HUD.
  const [myPrimary] = self !== null ? [self] : allies
  const myCompanions = allies.filter((entry) => entry.position !== myPrimary?.position)
  const enemyFocus =
    selectedTarget ??
    opponents.find((entry) => entry.position === battle.currentTurn.position) ??
    opponents[0]
  const enemyCompanions = opponents.filter((entry) => entry.position !== enemyFocus?.position)

  const timeoutAfterActions =
    lastTurnTimeout !== null &&
    lastTurnTimeout.seq > (lastAttack?.seq ?? 0) &&
    lastTurnTimeout.seq > (lastSkill?.seq ?? 0) &&
    lastTurnTimeout.seq > (lastHealSkill?.seq ?? 0)
  const timeoutEntry = battle.turnOrder.find(
    (entry) =>
      entry.teamLabel === lastTurnTimeout?.timedOut.teamLabel &&
      entry.seat === lastTurnTimeout.timedOut.seat,
  )
  // Mismo nombre que en el resto de la pantalla: una IA es "Oponente IA", nunca "Asiento N".
  const timeoutName =
    timeoutEntry === undefined ? t('battle:aParticipant') : combatantName(timeoutEntry)
  const feedback: ActionFeedback | null = timeoutAfterActions
    ? {
        headline: t('battle:battle.timedOut', { name: timeoutName }),
        impact: null,
        tone: 'neutral',
        life: null,
        detail: '',
      }
    : describeLatestAction(lastAttack, lastSkill, battle, lastHealSkill)

  // 9a pasada (secciones 38-44 del brief): estado de PRESENTACION (no de
  // dominio, no reducer, no store) que solo decide cuanto tiempo se ve el
  // feedback ya calculado arriba. Se identifica por su CONTENIDO (no por
  // referencia: `feedback` es un objeto nuevo en cada render) para saber si
  // es de verdad una accion NUEVA -- si llega otra antes de que termine el
  // temporizador, el efecto se reinicia solo (limpieza de `useEffect`), sin
  // cola ni historial nuevo.
  const feedbackSignature = feedback === null ? null : JSON.stringify(feedback)
  // Se ve mientras su firma no este en `hiddenSignature` (arranca visible: el
  // efecto de abajo SOLO agenda cuando ocultarla, nunca decide sincronamente
  // que se muestre -- eso ya lo decide el render con la firma actual).
  const [hiddenSignature, setHiddenSignature] = useState<string | null>(null)

  useEffect(() => {
    if (feedbackSignature === null) {
      return
    }

    const timer = window.setTimeout(() => {
      setHiddenSignature(feedbackSignature)
    }, COMBAT_FEEDBACK_VISIBLE_MS)

    return () => {
      window.clearTimeout(timer)
    }
  }, [feedbackSignature])

  const showFeedback = feedback !== null && feedbackSignature !== hiddenSignature

  return (
    <section
      aria-label={t('battle:battle.label')}
      className="br-scene br-scene-battle br-scene-pad br-battle-scene flex flex-col gap-3"
    >
      {/* Anuncio de turno para lectores de pantalla: siempre presente, sin franja visual grande
          (el turno se refuerza en "Nexus · Arena" y en la insignia junto al heroe activo). */}
      <p role="status" aria-live="polite" className="sr-only">
        {turn.headline}. {turn.detail}
      </p>

      {reconnecting && (
        <p role="status" className="text-center text-xs" style={{ color: 'var(--br-muted)' }}>
          {t('battle:battle.reconnectingLong')}
        </p>
      )}
      {connection === 'failed' && (
        <p role="alert" className="text-center text-xs" style={{ color: 'var(--br-danger)' }}>
          {t('battle:battle.authFailed')}
        </p>
      )}

      <div className="br-battle-stage">
        {/* HUD superior izquierdo (6a pasada, secciones 16-24 del brief): mi
            combatiente principal y sus companeros ya NO son asimetricos
            (antes el principal se pintaba a todo el ancho del HUD y los
            companeros en una fila mas chica debajo -- eso era exactamente
            el "Ana grande, Diego chico" que senalo Richard). Ahora los DOS
            son unidades iguales (`.br-hud-unit`), mismo ancho compacto,
            en una fila horizontal (`.br-hud-row`), cada una Nombre -> Vida
            -> Poder de arriba a abajo (nunca al reves). En 3v3, si no cabe
            una sola fila de 3, `.br-hud-row` (flex-wrap) la parte sola en
            2+1 -- sin volver a una columna alta. */}
        {myPrimary !== undefined && (
          <div className="br-hud-corner br-hud-corner--left">
            <ul
              className={clsx('br-hud-row', `br-hud-row--${String(1 + myCompanions.length)}`)}
              aria-label={allyTitle}
            >
              {[myPrimary, ...myCompanions].map((entry) => {
                const health = healthOf(entry)
                const power = combatantPower(battle, entry)

                return (
                  <li key={entry.position} className="br-hud-unit">
                    <p className="br-hud-unit-name">
                      <span className="truncate">
                        {combatantName(entry)}
                        {isSelf(entry) ? ` ${t('battle:youBadge')}` : ''}
                      </span>
                    </p>
                    {health !== undefined && (
                      <HealthBar name={combatantName(entry)} health={health} />
                    )}
                    {power !== null && <PowerMeter power={power} heroName={combatantName(entry)} />}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Centro superior: "Nexus · Arena" + turno actual, SIN mas (4a pasada, secciones
            35-37 del brief): ni la linea de apertura ("Inicia X la batalla · Ronda N"), ni
            la cola de turnos, ni "Conectado" permanente se muestran aqui -- todo eso sigue
            existiendo como DATO/anuncio accesible (el `<p role="status" className="sr-only">`
            de arriba ya dice titular + detalle; los avisos reales de reconexion/fallo viven
            justo encima de `.br-battle-stage`), solo se retiro la REPETICION visual. La
            seleccion de objetivo y el orden de turnos siguen funcionando igual. */}
        <div className="br-arena-center-badge">
          <p className="br-arena-center-eyebrow">{t('battle:battle.arenaEyebrow')}</p>
          <p className="br-arena-center-turn">{turn.headline}</p>
          {!finished && battle.deadlines !== undefined && serverClock !== null && (
            <div className="br-arena-center-timers">
              <BattleTimers
                battle={battle}
                serverClock={serverClock}
                isMyTurn={turn.isMyTurn}
                synced={synced}
              />
            </div>
          )}
        </div>

        {/* HUD superior derecho: mismo lenguaje que el HUD izquierdo (seccion
            21 del brief). El foco (objetivo elegido, o quien tiene el
            turno) va primero, sus companeros despues -- misma unidad, mismo
            ancho. */}
        {enemyFocus !== undefined && (
          <div className="br-hud-corner br-hud-corner--right">
            <p className="br-hud-corner-sub">
              {spectator === undefined ? t('battle:battle.enemyLabel') : opponentTitle}
            </p>
            <ul
              className={clsx('br-hud-row', `br-hud-row--${String(1 + enemyCompanions.length)}`)}
              aria-label={opponentTitle}
            >
              {[enemyFocus, ...enemyCompanions].map((entry) => {
                const health = healthOf(entry)
                const power = combatantPower(battle, entry)

                return (
                  <li key={entry.position} className="br-hud-unit">
                    <p className="br-hud-unit-name">
                      <span className="truncate">{combatantName(entry)}</span>
                    </p>
                    {health !== undefined && (
                      <HealthBar name={combatantName(entry)} health={health} />
                    )}
                    {power !== null && <PowerMeter power={power} heroName={combatantName(entry)} />}
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* Arena: mi equipo SIEMPRE a la izquierda, el enemigo SIEMPRE a la derecha (seccion 33
            del brief) -- sobre el campo de batalla del `.br-scene`, sin otro fondo encima. */}
        <div className="br-arena-field">
          <div className="br-arena-side br-arena-side--mine">
            <ArenaSide
              title={
                spectator === undefined && allies.length === 1
                  ? t('battle:battle.yourHero')
                  : allyTitle
              }
              entries={allies}
              isSelf={isSelf}
              isCurrent={isCurrent}
              direction="south-east"
              healthOf={(entry) => healthOf(entry)?.current}
            />
          </div>

          <p
            aria-hidden="true"
            className="br-vs-divider br-vs-divider--battle text-xl font-black tracking-widest md:text-2xl"
            style={{ color: 'var(--br-ink)' }}
          >
            VS
          </p>

          <div className="br-arena-side br-arena-side--enemy">
            <ArenaSide
              title={opponentTitle}
              entries={opponents}
              isSelf={isSelf}
              isCurrent={isCurrent}
              direction="north-west"
              healthOf={(entry) => healthOf(entry)?.current}
              isTargetable={isTargetableEntry}
              isTargetSelected={isTargetSelectedEntry}
              onSelectTarget={onSelectTarget}
            />
          </div>
        </div>

        {/* HU-21: la vista de resultado sigue en el ORDEN DEL DOM justo despues de la arena (sin
            `order` ni reordenar por CSS). `br-result-overlay` la ELEVA visualmente por encima de
            la arena (`position: absolute` dentro de `.br-battle-scene`, que es
            `position: relative`) sin destruir lo que hay detras. HU-22: el panel de recompensa es
            ADITIVO -- BattleResultView nunca muestra creditos (D4). */}
        {result !== null && (
          <div className="br-result-overlay">
            {/* 5a pasada (secciones 61/64 del brief): gap reducido (mas
                densidad vertical); el ANCHO (`max-w-[820px]`) no se toca. */}
            <div className="flex w-full max-w-[820px] flex-col items-stretch gap-2">
              <BattleResultView result={result} subject={subject} />
              <RewardPanel battleId={battle.battleId} subject={subject} />
              {/* HU-23: la apuesta propia, solo si la hubo (el panel no se renderiza
                  cuando no hay nada que contar). */}
              <StakePanel roomId={battle.battleId} subject={subject} />
            </div>
          </div>
        )}

        {/* Ultima accion: registro FLOTANTE abajo-izquierda (seccion 44-45 del brief), TRANSITORIO
            -- aparece, se lee, desaparece solo (`showFeedback`, arriba) -- superpuesto al
            escenario, nunca un bloque separado debajo de la arena. La region viva existe SIEMPRE
            (los lectores de pantalla anuncian los cambios de una region que ya estaba en la
            pagina); vacia, no ocupa espacio visual (seccion 89-90: nunca una caja grande vacia, ni
            un overlay que empuje el layout). */}
        <div
          role="status"
          aria-live="polite"
          aria-label={t('battle:battle.lastAction')}
          className={clsx(showFeedback && 'br-floating-log')}
        >
          {showFeedback && (
            <>
              {feedback.notice !== undefined && (
                <p className="br-floating-log-line br-floating-log-line--info">{feedback.notice}</p>
              )}
              <p className="br-floating-log-line br-floating-log-line--info">{feedback.headline}</p>
              {feedback.impact !== null && (
                <p
                  className={clsx(
                    'br-floating-log-line',
                    feedback.tone === 'damage' && 'br-floating-log-line--damage',
                    feedback.tone === 'heal' && 'br-floating-log-line--heal',
                    feedback.tone === 'neutral' && 'br-floating-log-line--info',
                  )}
                >
                  {feedback.impact}
                </p>
              )}
              {feedback.life !== null && (
                <p className="br-floating-log-line br-floating-log-line--info">{feedback.life}</p>
              )}
              {feedback.detail !== '' && (
                <p className="br-floating-log-line br-floating-log-line--info">{feedback.detail}</p>
              )}
            </>
          )}
        </div>

        {/* 7a pasada (secciones 22-33, 57-58 del brief): la barra de acciones se MUEVE de un
            bloque separado debajo de `.br-battle-stage` a vivir DENTRO de el, abajo-DERECHA
            (`.br-bottom-actions`, `position: absolute` -- mismo patron que el combat log de
            arriba, abajo-izquierda) -- juntos forman un HUD inferior de una sola fila, sin
            "segunda pagina" ni scroll para atacar. HU-21: tras el final las acciones NO existen
            (no se muestran deshabilitadas). */}
        {!finished && spectator === undefined && (
          <div className="br-bottom-actions">
            {combat === undefined ? (
              <p
                aria-label={t('battle:battle.actions')}
                className="br-panel rounded-xl p-3 text-center text-xs"
                style={{ color: 'var(--br-muted)' }}
              >
                {t('battle:battle.actionsUnavailable')}
              </p>
            ) : (
              <AttackPanel
                battle={battle}
                subject={subject}
                connection={connection}
                synced={synced}
                combat={combat}
                selectedTarget={selectedTarget}
              />
            )}
          </div>
        )}
      </div>
    </section>
  )
}
