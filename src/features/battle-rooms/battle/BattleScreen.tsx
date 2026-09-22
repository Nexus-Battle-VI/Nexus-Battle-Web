import clsx from 'clsx'

import type { RealtimeConnectionState } from '../realtime'

import { AttackPanel, type CombatControls } from './AttackPanel'
import { ArenaSide } from './BattleArena'
import { BattleResultView } from './BattleResultView'
import { RewardPanel } from './RewardPanel'
import { BattleTimers } from './BattleTimers'
import type { ServerClock } from './battleClock'
import type { LastAttack, LastSkill, LastTurnTimeout } from './battleReducer'
import {
  combatantHealth,
  describeTurn,
  findSelf,
  groupCombatants,
  hasCombatState,
} from './presentation'
import { describeLatestAction } from './skillPresentation'
import { TurnOrderStrip } from './TurnOrderStrip'
import type { BattleResult, BattleView, HealthView, TurnOrderEntry } from './types'

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
}

/** Estado de la conexion en TEXTO (el punto de color solo lo refuerza). */
const connectionLabel = (connection: RealtimeConnectionState, reconnecting: boolean): string =>
  reconnecting
    ? 'Reconectando…'
    : connection === 'open'
      ? 'Conectado'
      : connection === 'connecting'
        ? 'Conectando…'
        : 'Sin conexión'

/**
 * Pantalla de batalla (HU-17, HU-18) como una ARENA: los heroes enfrentados y su Vida son lo
 * principal; despues el turno, la accion, el resultado del ultimo golpe y, como informacion
 * secundaria, el orden de turnos. Solo LEE lo que publica Combat: no calcula turnos, no decide
 * resultados ni dano y no genera aleatoriedad.
 *
 * UN SOLO ARBOL DE DOM, con el orden logico de lectura: estado -> arena -> resultado ->
 * acciones -> turnos. En pantallas medianas y amplias (`md`/`lg`, segun cuantos haya por lado) la arena pasa a tres columnas (rival · VS ·
 * mi lado) y en moviles se apila; nunca se reordena con CSS (`order`), asi el orden del teclado
 * y de los lectores de pantalla coincide con el del DOM.
 *
 * Todo lo importante es TEXTO (no solo color): "Tu turno" / "Turno de <nombre>", "Turno actual",
 * "Tú", `32 / 44` de Vida, "Sin efecto"/"Golpe crítico"...
 */
export const BattleScreen = ({
  battle,
  subject,
  connection,
  synced,
  lastAttack = null,
  lastSkill = null,
  combat,
  result = null,
  lastTurnTimeout = null,
  serverClock = null,
}: BattleScreenProps): React.JSX.Element => {
  const finished = result !== null
  const turn = finished
    ? { isMyTurn: false, headline: 'Batalla terminada', detail: `Ronda ${String(battle.round)}` }
    : describeTurn(battle, subject)
  const self = findSelf(battle, subject)
  const { allies, opponents } = groupCombatants(battle, subject)
  const isCurrent = (entry: TurnOrderEntry): boolean =>
    entry.position === battle.currentTurn.position
  const isSelf = (entry: TurnOrderEntry): boolean =>
    self !== null && entry.position === self.position
  const reconnecting = connection === 'reconnecting' || (connection === 'open' && !synced)
  const withHealth = hasCombatState(battle)
  const healthOf = (entry: TurnOrderEntry): HealthView | null | undefined =>
    withHealth ? combatantHealth(battle, entry) : undefined
  const timeoutAfterActions =
    lastTurnTimeout !== null &&
    lastTurnTimeout.seq > (lastAttack?.seq ?? 0) &&
    lastTurnTimeout.seq > (lastSkill?.seq ?? 0)
  const timeoutEntry = battle.turnOrder.find(
    (entry) =>
      entry.teamLabel === lastTurnTimeout?.timedOut.teamLabel &&
      entry.seat === lastTurnTimeout.timedOut.seat,
  )
  const timeoutName =
    timeoutEntry?.displayName ?? `Asiento ${String((lastTurnTimeout?.timedOut.seat ?? 0) + 1)}`
  const feedback = timeoutAfterActions
    ? { headline: `${timeoutName} perdió el turno por tiempo.`, detail: '' }
    : describeLatestAction(lastAttack, lastSkill, battle)
  // Con 1 o 2 participantes por lado la arena ya cabe en horizontal desde `md` (tablet); con 3
  // hace falta `lg`. Depende solo de cuantos son, no de nombres ni de la modalidad.
  const horizontalFrom =
    opponents.length <= 2 && allies.length <= 2
      ? 'md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-4'
      : 'lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-4'

  return (
    <section aria-label="Batalla" className="flex flex-col gap-3 lg:gap-4">
      {/* HUD compacto: turno y ronda a la izquierda, conexion a la derecha. */}
      <div
        className={clsx(
          'flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl border px-4 py-2.5',
          'motion-safe:transition-colors motion-safe:duration-300',
          turn.isMyTurn ? 'border-brand bg-brand/10' : 'border-border bg-surface-raised',
        )}
      >
        <div
          role="status"
          aria-live="polite"
          className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5"
        >
          <p className="text-xl font-bold text-ink">{turn.headline}</p>
          <p className="text-sm text-muted">{turn.detail}</p>
        </div>
        <p className="flex items-center gap-2 text-xs font-medium text-muted">
          <span
            aria-hidden="true"
            className={clsx(
              'size-2 rounded-full',
              connection === 'failed'
                ? 'bg-danger'
                : reconnecting || connection === 'connecting'
                  ? 'bg-warning'
                  : 'bg-success',
            )}
          />
          {connectionLabel(connection, reconnecting)}
        </p>
      </div>

      {!finished && battle.deadlines !== undefined && serverClock !== null && (
        <BattleTimers
          battle={battle}
          serverClock={serverClock}
          isMyTurn={turn.isMyTurn}
          synced={synced}
        />
      )}

      {reconnecting && (
        <p role="status" className="text-center text-xs text-muted">
          Reconectando en tiempo real… El estado se recuperará al volver la conexión.
        </p>
      )}
      {connection === 'failed' && (
        <p role="alert" className="text-center text-xs text-danger">
          No se pudo autenticar la conexión en tiempo real. Vuelve a entrar a la batalla.
        </p>
      )}

      {/* Arena: rival · VS · mi lado. Un solo DOM; la rejilla horizontal solo aplica desde `lg`. */}
      <div
        className={clsx(
          'grid grid-cols-1 items-stretch gap-3 rounded-2xl border border-border p-3 sm:p-4',
          'bg-surface-raised bg-[radial-gradient(ellipse_at_50%_0%,color-mix(in_oklab,var(--color-brand)_14%,transparent),transparent_70%)]',
          horizontalFrom,
        )}
      >
        <ArenaSide
          battle={battle}
          title="Rival"
          entries={opponents}
          isSelf={isSelf}
          isCurrent={isCurrent}
          healthOf={healthOf}
        />

        <p
          aria-hidden="true"
          className="flex items-center justify-center text-2xl font-black tracking-widest text-muted md:px-2 md:text-3xl"
        >
          VS
        </p>

        <ArenaSide
          battle={battle}
          title={allies.length > 1 ? 'Tu equipo' : 'Tu héroe'}
          entries={allies}
          isSelf={isSelf}
          isCurrent={isCurrent}
          healthOf={healthOf}
        />
      </div>

      {/* HU-21: la vista de resultado va ENTRE la arena y el resto; el orden del DOM es
          el orden de lectura (sin `order` ni posiciones absolutas). HU-22: el panel de
          recompensa es ADITIVO, justo despues -- BattleResultView nunca muestra creditos (D4). */}
      {finished && <BattleResultView result={result} subject={subject} />}
      {finished && <RewardPanel battleId={battle.battleId} subject={subject} />}

      {/* La region viva existe siempre (los lectores de pantalla anuncian los cambios de una
          region que ya estaba en la pagina) y, vacia, no ocupa ni reserva altura. */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Resultado de la última acción"
        className={clsx(
          feedback === null
            ? '-mt-3 lg:-mt-4'
            : 'rounded-xl border border-border bg-surface-raised px-4 py-2 text-center',
        )}
      >
        {feedback !== null && (
          <p className="text-sm sm:text-base">
            <span className="font-semibold text-ink">{feedback.headline}</span>{' '}
            <span className="text-muted">{feedback.detail}</span>
          </p>
        )}
      </div>

      {/* HU-21: tras el final las acciones NO existen (no se muestran deshabilitadas). */}
      {!finished &&
        (combat === undefined ? (
          <p
            aria-label="Acciones de combate"
            className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted"
          >
            Las acciones de combate no están disponibles en esta vista.
          </p>
        ) : (
          <AttackPanel
            battle={battle}
            subject={subject}
            connection={connection}
            synced={synced}
            combat={combat}
          />
        ))}

      <TurnOrderStrip battle={battle} isSelf={isSelf} isCurrent={isCurrent} />
    </section>
  )
}
