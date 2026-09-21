import clsx from 'clsx'

import { Card } from '@/components/ui/Card'
import { heroIdFromSubtype } from '@/features/player-inventory/equipment/heroSubtype'
import { Hero3D } from '@/shared/visual-library/heroes'
import type { RealtimeConnectionState } from '../realtime'

import { AttackPanel, type CombatControls } from './AttackPanel'
import type { LastAttack } from './battleReducer'
import { HealthBar } from './HealthBar'
import {
  combatantHealth,
  combatantName,
  describeLastAttack,
  describeTurn,
  findSelf,
  groupCombatants,
  hasCombatState,
} from './presentation'
import type { BattleView, HealthView, TurnOrderEntry } from './types'

interface CombatantCardProps {
  readonly entry: TurnOrderEntry
  readonly isSelf: boolean
  readonly isActive: boolean
  /** `undefined` si la batalla no trae Vida (iniciada antes de HU-18): no se pinta la barra. */
  readonly health: HealthView | null | undefined
}

/**
 * Un combatiente: su heroe (modelo real de la biblioteca visual, o un marcador
 * cuando no hay heroe conocido -- p. ej. un oponente IA), su nombre, su equipo y su Vida.
 * NUNCA muestra `playerId`, `heroId` ni ningun identificador tecnico.
 */
const CombatantCard = ({
  entry,
  isSelf,
  isActive,
  health,
}: CombatantCardProps): React.JSX.Element => {
  const modelId = entry.heroSubtype === null ? null : heroIdFromSubtype(entry.heroSubtype)
  const name = combatantName(entry)

  return (
    <li
      aria-label={`${name}${isSelf ? ' (tú)' : ''}, equipo ${entry.teamLabel}${isActive ? ', turno actual' : ''}`}
      className={clsx(
        'flex flex-col gap-2 rounded-lg border bg-surface p-3',
        isActive ? 'border-brand ring-2 ring-brand' : 'border-border',
      )}
    >
      <div className="mx-auto w-full max-w-40">
        {modelId === null ? (
          <div
            role="img"
            aria-label={name}
            className="flex aspect-square w-full items-center justify-center rounded-md bg-surface-raised text-3xl font-bold text-muted"
          >
            {name.charAt(0).toUpperCase()}
          </div>
        ) : (
          <Hero3D heroId={modelId} />
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-center">
        <span className="truncate text-sm font-semibold text-ink">{name}</span>
        {isSelf && (
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-ink ring-1 ring-brand">
            Tú
          </span>
        )}
        {isActive && (
          <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-brand-ink">
            Turno actual
          </span>
        )}
      </div>
      <p className="text-center text-xs text-muted">Equipo {entry.teamLabel}</p>
      {health !== undefined && <HealthBar name={name} health={health} />}
    </li>
  )
}

export interface BattleScreenProps {
  readonly battle: BattleView
  /** `sub` verificado de la sesion: solo sirve para decir "tu turno" y marcar "tú". */
  readonly subject: string | null
  readonly connection: RealtimeConnectionState
  /** `false` mientras se recupera el estado tras una reconexion. */
  readonly synced: boolean
  /** El ultimo ataque basico que publico el servidor (HU-18); `null` si aun no hubo ninguno. */
  readonly lastAttack?: LastAttack | null
  /**
   * Acciones de combate (HU-18). Sin ellas la pantalla es de solo lectura: se ve la Vida y
   * el turno, pero no se ofrece ningun boton.
   */
  readonly combat?: CombatControls
}

/**
 * Pantalla de batalla (HU-17, HU-18): rival, "VS", tu equipo con la Vida de cada uno, quien
 * tiene el turno, el resultado del ultimo ataque, las acciones y el orden de turnos. Solo LEE lo
 * que publica Combat: no calcula turnos, no decide resultados ni dano y no genera aleatoriedad.
 *
 * Todo lo importante es TEXTO (no solo color): "Tu turno" / "Turno de <nombre>",
 * "Turno actual", "Tú", `32 / 44` de Vida, "Sin efecto"/"Golpe crítico"...
 */
export const BattleScreen = ({
  battle,
  subject,
  connection,
  synced,
  lastAttack = null,
  combat,
}: BattleScreenProps): React.JSX.Element => {
  const turn = describeTurn(battle, subject)
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
  const feedback = lastAttack === null ? null : describeLastAttack(lastAttack, battle)

  return (
    <section aria-label="Batalla" className="flex flex-col gap-6">
      <div
        role="status"
        aria-live="polite"
        className={clsx(
          'rounded-lg border p-4 text-center',
          'motion-safe:transition-colors motion-safe:duration-300',
          turn.isMyTurn ? 'border-brand bg-brand/10' : 'border-border bg-surface',
        )}
      >
        <p className="text-2xl font-bold text-ink">{turn.headline}</p>
        <p className="text-sm text-muted">{turn.detail}</p>
      </div>

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

      {/* La region viva existe siempre: los lectores de pantalla anuncian los cambios de una
          region que ya estaba en la pagina, no la que aparece con su contenido. */}
      <div
        role="status"
        aria-live="polite"
        aria-label="Resultado del último ataque"
        className={clsx(
          feedback !== null && 'rounded-lg border border-border bg-surface-raised p-4 text-center',
        )}
      >
        {feedback !== null && (
          <>
            <p className="text-base font-semibold text-ink">{feedback.headline}</p>
            <p className="text-sm text-muted">{feedback.detail}</p>
          </>
        )}
      </div>

      <Card title="Rival" description={opponents.length > 1 ? 'Equipo rival' : 'Tu oponente'}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {opponents.map((entry) => (
            <CombatantCard
              key={entry.position}
              entry={entry}
              isSelf={isSelf(entry)}
              isActive={isCurrent(entry)}
              health={healthOf(entry)}
            />
          ))}
        </ul>
      </Card>

      <p aria-hidden="true" className="text-center text-lg font-bold tracking-widest text-muted">
        VS
      </p>

      <Card title="Tu equipo" description={allies.length > 1 ? 'Tu equipo' : 'Tú'}>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {allies.map((entry) => (
            <CombatantCard
              key={entry.position}
              entry={entry}
              isSelf={isSelf(entry)}
              isActive={isCurrent(entry)}
              health={healthOf(entry)}
            />
          ))}
        </ul>
      </Card>

      {combat === undefined ? (
        <p
          aria-label="Acciones de combate"
          className="rounded-md border border-dashed border-border p-4 text-center text-xs text-muted"
        >
          Las habilidades y la épica llegarán con las siguientes historias de Jugar Online.
        </p>
      ) : (
        <AttackPanel
          battle={battle}
          subject={subject}
          connection={connection}
          synced={synced}
          combat={combat}
        />
      )}

      <Card title="Orden de turnos" description="Fijo durante toda la batalla">
        <ol aria-label="Orden de turnos" className="flex flex-col gap-2">
          {battle.turnOrder.map((entry) => (
            <li
              key={entry.position}
              className={clsx(
                'flex items-center gap-2 rounded-md border px-3 py-2 text-sm',
                isCurrent(entry) ? 'border-brand bg-brand/10 font-semibold' : 'border-border',
              )}
            >
              <span className="w-6 text-muted">{entry.position + 1}.</span>
              <span className="flex-1 truncate text-ink">
                {combatantName(entry)}
                {isSelf(entry) ? ' (tú)' : ''}
              </span>
              <span className="text-xs text-muted">Equipo {entry.teamLabel}</span>
              {isCurrent(entry) && (
                <span className="text-xs font-semibold text-ink">Turno actual</span>
              )}
            </li>
          ))}
        </ol>
      </Card>
    </section>
  )
}
