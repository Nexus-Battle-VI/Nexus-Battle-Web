import clsx from 'clsx'

import type { AvailableHero } from './heroSelectionApi'
import { heroRoleLabel } from './heroRole'

export interface HeroCatalogListProps {
  readonly heroes: readonly AvailableHero[]
  readonly activeReference: string | null
  readonly disabled: boolean
  readonly onChoose: (hero: AvailableHero) => void
}

/**
 * Catálogo de héroes del jugador (HU-07, CA-02 y CA-11).
 *
 * EL RECUENTO SE DERIVA DE LA RESPUESTA, no de un ocho escrito a mano. Si
 * administración aprueba un héroe nuevo, el encabezado dice nueve sin que nadie
 * toque este archivo; y si el jugador solo posee tres, dice tres en vez de
 * mentir. El diseño rotula «(8)» porque el prototipo se hizo con los ocho
 * prototipos iniciales en el inventario, no porque ocho sea un límite.
 *
 * CADA FILA ES UN BOTÓN REAL, con `aria-pressed`: la selección se entiende con
 * el lector de pantalla y funciona por teclado, no solo por el borde de color.
 *
 * UN HÉROE SUSPENDIDO SE MUESTRA Y NO SE OCULTA, pero no se puede preparar:
 * esconderlo dejaría a quien lo compró sin entender por qué desapareció.
 */
export const HeroCatalogList = ({
  heroes,
  activeReference,
  disabled,
  onChoose,
}: HeroCatalogListProps): React.JSX.Element => (
  <div className="flex flex-col gap-1 p-3">
    <p
      id="hero-catalog-label"
      className="px-1 text-xs font-semibold tracking-widest text-muted uppercase"
    >
      Catálogo de héroes ({heroes.length})
    </p>

    <ul aria-labelledby="hero-catalog-label" className="flex flex-col gap-1">
      {heroes.map((hero) => {
        const active = hero.reference === activeReference
        const available = hero.lifecycleStatus === 'ACTIVE'

        return (
          <li key={hero.heroId}>
            <button
              type="button"
              disabled={disabled || !available}
              aria-pressed={active}
              onClick={() => {
                onChoose(hero)
              }}
              className={clsx(
                'flex w-full items-center gap-4 rounded-md border bg-surface p-3 text-left transition-colors',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
                'disabled:cursor-not-allowed disabled:opacity-50',
                active
                  ? 'border-brand ring-1 ring-brand'
                  : 'border-border enabled:hover:border-brand',
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-ink">{hero.name}</span>
                <span className="mt-0.5 block text-[11px] text-muted">
                  Poder {hero.baseStats.power} · Vida {hero.baseStats.health} · Def{' '}
                  {hero.baseStats.defense}
                </span>
              </span>
              <span className="shrink-0 text-xs font-semibold text-ink">
                {available ? heroRoleLabel(hero.subtype) : 'No disponible'}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  </div>
)
