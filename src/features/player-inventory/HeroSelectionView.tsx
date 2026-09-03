import { Link } from 'react-router'

import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { QueryState } from '@/components/ui/QueryState'

import {
  describeSelectionFailure,
  type AvailableHero,
  type HeroSelection,
} from './heroSelectionApi'
import { HeroCatalogList } from './HeroCatalogList'
import { HeroInfoPanel } from './HeroInfoPanel'
import { HeroViewport } from './HeroViewport'
import { LoadoutSummary } from './LoadoutSummary'

export interface HeroSelectionViewProps {
  readonly heroes: readonly AvailableHero[]
  /** `null` = el jugador todavía no ha preparado ninguno. No es un error. */
  readonly selection: HeroSelection | null
  readonly isLoading: boolean
  readonly loadError: unknown
  readonly loaded: boolean
  readonly activeReference: string | null
  readonly pending: boolean
  readonly selectError: unknown
  readonly onChoose: (hero: AvailableHero) => void
}

/**
 * Composición visual de «Selecciona tu héroe» (HU-07, diseño de Figma
 * `87:22` / `262:26` / `262:181`).
 *
 * ES PURAMENTE PRESENTACIONAL: recibe los datos y devuelve el evento de
 * elección. No consulta, no muta y no decide reglas. Separarla de la pantalla
 * permite revisarla con datos de ejemplo —`dev/HeroSelectionDevPreview`— sin
 * montar una sesión ni levantar los servicios, y sin que la vista previa sea
 * una copia paralela que pueda desviarse de lo que se sirve de verdad.
 *
 * LOS TRES ESTADOS DEL PROTOTIPO SON EL MISMO COMPONENTE con otro héroe
 * elegido: el diseño no define tres pantallas, define una con tres selecciones.
 */
export const HeroSelectionView = ({
  heroes,
  selection,
  isLoading,
  loadError,
  loaded,
  activeReference,
  pending,
  selectError,
  onChoose,
}: HeroSelectionViewProps): React.JSX.Element => {
  const heroeActivo = heroes.find((hero) => hero.reference === activeReference) ?? null

  // El resumen solo refleja al héroe realmente preparado. Mientras se guarda
  // otra elección se deja vacío, en vez de mostrar el equipamiento del anterior
  // bajo el nombre del nuevo, que sería una afirmación falsa.
  const configuracionVisible =
    selection !== null && selection.configuration.hero.reference === activeReference
      ? selection.configuration
      : undefined

  return (
    <section aria-label="Selección de héroe" className="flex flex-col gap-5">
      <header className="flex flex-col gap-4">
        <Breadcrumb
          items={[
            { label: 'Inicio', to: '/ecommerce' },
            { label: 'Mi Inventario', to: '/inventory' },
            { label: 'Selección de héroe' },
          ]}
        />
        <h1 className="text-3xl font-bold tracking-tight text-balance text-ink">
          Selecciona tu héroe
        </h1>
        <p className="max-w-3xl text-base text-muted">
          Elige un héroe de tu inventario y equípalo antes de iniciar tu primera batalla. El
          equipamiento con el que entres queda fijo mientras dure el combate.
        </p>
      </header>

      <QueryState
        isLoading={isLoading}
        error={loadError}
        isEmpty={loaded && heroes.length === 0}
        emptyMessage="Todavía no tienes ningún héroe en tu inventario. Consigue uno en el E-commerce para poder prepararlo."
      >
        <>
          <div className="grid overflow-hidden rounded-2xl border border-border bg-surface-raised lg:min-h-[32rem] lg:grid-cols-[19rem_minmax(0,1fr)_24rem] lg:divide-x lg:divide-border">
            <HeroCatalogList
              heroes={heroes}
              activeReference={activeReference}
              disabled={pending}
              onChoose={onChoose}
            />

            <HeroViewport hero={heroeActivo} />

            <HeroInfoPanel hero={heroeActivo} />
          </div>

          {selectError !== null && selectError !== undefined && (
            <p role="alert" className="text-sm text-danger">
              {describeSelectionFailure(selectError)}
            </p>
          )}

          {selection !== null && !selection.readiness.ready && (
            <div role="status" className="rounded-lg border border-danger/40 bg-surface-raised p-4">
              <p className="text-sm font-semibold text-danger">
                Este héroe todavía no puede entrar a una batalla.
              </p>
              <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs text-muted">
                {selection.readiness.blockers.map((blocker) => (
                  <li key={`${blocker.code}-${blocker.reference}`}>{blocker.detail}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <LoadoutSummary configuration={configuracionVisible} />

            <div className="flex flex-col items-end gap-1">
              <Link
                to="/inventory"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-brand px-4 text-sm font-semibold text-brand-ink transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Ir a equipar
              </Link>
              {selection !== null && (
                <p className="text-[11px] text-muted">
                  {pending
                    ? 'Preparando…'
                    : selection.readiness.ready
                      ? 'Héroe listo para batalla, misión o torneo.'
                      : 'Resuelve los avisos para poder jugar.'}
                </p>
              )}
            </div>
          </div>
        </>
      </QueryState>
    </section>
  )
}
