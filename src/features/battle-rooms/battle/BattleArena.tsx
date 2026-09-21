import { useId } from 'react'
import clsx from 'clsx'

import { heroIdFromSubtype } from '@/features/player-inventory/equipment/heroSubtype'
import { Hero3D } from '@/shared/visual-library/heroes'

import { HealthBar } from './HealthBar'
import { combatantName } from './presentation'
import type { HealthView, TurnOrderEntry } from './types'

interface CombatantCardProps {
  readonly entry: TurnOrderEntry
  readonly isSelf: boolean
  readonly isActive: boolean
  /** `undefined` si la batalla no trae Vida (iniciada antes de HU-18): no se pinta la barra. */
  readonly health: HealthView | null | undefined
  /** Cuantos participantes hay en su lado: decide el tamano del heroe, sin casos por nombre. */
  readonly sideSize: number
}

/**
 * Ancho maximo del heroe segun cuantos comparten lado: prominente en 1 contra 1, mas
 * compacto conforme crece el equipo. En pantallas amplias tambien lo acota la altura de la
 * ventana (`vh`), para que ambos heroes, la Vida y la accion quepan sin desplazarse.
 */
const heroWidth = (sideSize: number): string =>
  sideSize <= 1
    ? 'max-w-44 sm:max-w-48 md:max-w-[min(13rem,26vh)] 2xl:max-w-[min(16rem,28vh)]'
    : sideSize === 2
      ? 'max-w-36 sm:max-w-40 md:max-w-[min(9rem,19vh)] 2xl:max-w-[min(11rem,22vh)]'
      : 'max-w-28 sm:max-w-32 lg:max-w-[min(7rem,15vh)] 2xl:max-w-[min(8.5rem,17vh)]'

/** Columnas de un lado: una sola en movil (nunca dos heroes diminutos a 320 px) y hasta tres desde `sm`. */
const sideColumns = (sideSize: number): string =>
  sideSize <= 1
    ? 'grid-cols-1'
    : sideSize === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : 'grid-cols-1 sm:grid-cols-3'

/**
 * Un combatiente: su heroe (modelo real de la biblioteca visual, o un marcador cuando no hay
 * heroe conocido -- p. ej. un oponente IA), su nombre, sus insignias minimas y su Vida.
 * NUNCA muestra `playerId`, `heroId` ni ningun identificador tecnico. El equipo no se repite
 * en cada tarjeta: ya lo dice el titulo del lado (y el `aria-label`, para lectores de pantalla).
 */
const CombatantCard = ({
  entry,
  isSelf,
  isActive,
  health,
  sideSize,
}: CombatantCardProps): React.JSX.Element => {
  const modelId = entry.heroSubtype === null ? null : heroIdFromSubtype(entry.heroSubtype)
  const name = combatantName(entry)

  return (
    <li
      aria-label={`${name}${isSelf ? ' (tú)' : ''}, equipo ${entry.teamLabel}${isActive ? ', turno actual' : ''}`}
      className={clsx(
        'flex min-w-0 flex-col items-center gap-2 rounded-xl border bg-surface/70 p-3',
        'motion-safe:transition-shadow motion-safe:duration-300',
        isActive ? 'border-brand ring-2 ring-brand' : 'border-border',
      )}
    >
      <div className={clsx('w-full', heroWidth(sideSize))}>
        {modelId === null ? (
          <div
            role="img"
            aria-label={name}
            className="flex aspect-square w-full items-center justify-center rounded-md bg-surface-raised text-3xl font-bold text-muted"
          >
            {name.charAt(0).toUpperCase()}
          </div>
        ) : (
          <Hero3D heroId={modelId} className="text-center" />
        )}
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-1.5">
        <span className="truncate text-base font-semibold text-ink">{name}</span>
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
      {health !== undefined && (
        <div className="w-full">
          <HealthBar name={name} health={health} />
        </div>
      )}
    </li>
  )
}

export interface ArenaSideProps {
  /** Titulo corto del lado («Rival», «Tu héroe», «Tu equipo»). */
  readonly title: string
  readonly entries: readonly TurnOrderEntry[]
  readonly isSelf: (entry: TurnOrderEntry) => boolean
  readonly isCurrent: (entry: TurnOrderEntry) => boolean
  readonly healthOf: (entry: TurnOrderEntry) => HealthView | null | undefined
}

/**
 * Un lado de la arena. Las tarjetas se reparten en una rejilla propia (1, 2 o 3 columnas) que
 * no depende de nombres ni de casos por modalidad: solo de cuantos participantes trae.
 */
export const ArenaSide = ({
  title,
  entries,
  isSelf,
  isCurrent,
  healthOf,
}: ArenaSideProps): React.JSX.Element => {
  const headingId = useId()

  return (
    <section aria-labelledby={headingId} className="flex min-w-0 flex-col gap-2">
      <h2
        id={headingId}
        className="text-center text-xs font-semibold uppercase tracking-widest text-muted"
      >
        {title}
      </h2>
      <ul
        className={clsx(
          'grid flex-1 gap-3',
          sideColumns(entries.length),
          entries.length <= 1 && 'mx-auto w-full max-w-sm',
        )}
      >
        {entries.map((entry) => (
          <CombatantCard
            key={entry.position}
            entry={entry}
            isSelf={isSelf(entry)}
            isActive={isCurrent(entry)}
            health={healthOf(entry)}
            sideSize={entries.length}
          />
        ))}
      </ul>
    </section>
  )
}
